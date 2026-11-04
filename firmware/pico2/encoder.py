# Quadrature encoder support.
#
# On the Pico 2 each encoder uses one PIO state machine that counts rising edges of channel A and
# takes the direction from channel B ("x1" decoding: 64 / 4 = 16 counts per motor turn, 1120 per
# output turn at 70:1). The program uses only label jumps, so it works at any load offset; the
# usual x4 jump-table decoder needs to be loaded at address 0, which MicroPython does not guarantee.
# Every edge pushes the running count; poll() must drain the RX FIFO often enough that it never
# fills (about 1 kHz at full speed), and keeps the newest value.
#
# decode_x4() is the full 16-transition table for host simulation and slow hand-rotation checks.

# index = (previous AB << 2) | new AB; value = count change, None = invalid (both channels changed)
_X4 = (0, -1, 1, None, 1, 0, None, -1, -1, None, 0, 1, None, 1, -1, 0)


def decode_x4(previous_ab, new_ab):
    return _X4[((previous_ab & 3) << 2) | (new_ab & 3)]


class X4Counter:
    """Software x4 decoder for simulations and slow manual checks."""

    def __init__(self):
        self.count = 0
        self.state = 0
        self.errors = 0

    def feed(self, ab):
        change = decode_x4(self.state, ab)
        if change is None:
            self.errors += 1
        else:
            self.count += change
        self.state = ab & 3
        return self.count


def to_int32(value):
    value &= 0xFFFFFFFF
    return value - 0x100000000 if value & 0x80000000 else value


try:
    import rp2

    @rp2.asm_pio(fifo_join=rp2.PIO.JOIN_RX)
    def _edge_counter():
        # in_base = channel A, jmp_pin = channel B; X holds the signed running count.
        mov(x, null)
        wrap_target()
        wait(0, pin, 0)
        wait(1, pin, 0)
        jmp(pin, "down")
        mov(x, invert(x))
        jmp(x_dec, "up_done")
        label("up_done")
        mov(x, invert(x))
        jmp("report")
        label("down")
        jmp(x_dec, "report")
        label("report")
        mov(isr, x)
        push(noblock)
        wrap()

    class PioEncoder:
        def __init__(self, sm_id, pin_a, pin_b, sign=1):
            from machine import Pin
            self._sm = rp2.StateMachine(sm_id, _edge_counter, in_base=Pin(pin_a, Pin.IN, Pin.PULL_UP), jmp_pin=Pin(pin_b, Pin.IN, Pin.PULL_UP))
            self._sm.active(1)
            self.sign = sign
            self.last = 0

        def poll(self):
            while self._sm.rx_fifo():
                self.last = to_int32(self._sm.get())
            return self.sign * self.last

except ImportError:
    PioEncoder = None
