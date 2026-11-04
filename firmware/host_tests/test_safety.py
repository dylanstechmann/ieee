import unittest

from safety import STOP_AUTO, STOP_ESTOP, STOP_FAULT, STOP_OVERRUN, STOP_WATCHDOG, SafetyMonitor


class SafetyTests(unittest.TestCase):
    def armed(self, **kw):
        s = SafetyMonitor(**kw)
        self.assertTrue(s.arm(1000, estop_active=False, commands_are_zero=True))
        return s

    def test_starts_stopped_and_needs_arming(self):
        s = SafetyMonitor()
        self.assertTrue(s.stopped)
        self.assertEqual(s.filter(0.5, 0.5), (0.0, 0.0))

    def test_arming_refuses_estop_or_nonzero_commands(self):
        s = SafetyMonitor()
        self.assertFalse(s.arm(0, estop_active=True, commands_are_zero=True))
        self.assertFalse(s.arm(0, estop_active=False, commands_are_zero=False))
        self.assertTrue(s.stopped)

    def test_estop_latches_and_stays_latched(self):
        s = self.armed()
        s.note_command(1010)
        s.update(1010, estop_active=True)
        self.assertEqual(s.stop_reason, STOP_ESTOP)
        s.update(1020, estop_active=False)
        self.assertTrue(s.stopped)
        self.assertEqual(s.filter(1.0, -1.0), (0.0, 0.0))

    def test_auto_stop_at_exactly_178_seconds(self):
        s = self.armed()
        s.note_command(1000 + 177999)
        s.update(1000 + 177999, estop_active=False)
        self.assertFalse(s.stopped)
        s.note_command(1000 + 178000)
        s.update(1000 + 178000, estop_active=False)
        self.assertEqual(s.stop_reason, STOP_AUTO)

    def test_command_watchdog(self):
        s = self.armed(command_timeout_ms=250)
        s.update(1250, estop_active=False)
        self.assertFalse(s.stopped)
        s.update(1251, estop_active=False)
        self.assertEqual(s.stop_reason, STOP_WATCHDOG)

    def test_driver_fault_and_overruns(self):
        s = self.armed()
        s.update(1001, estop_active=False, driver_fault=True)
        self.assertEqual(s.stop_reason, STOP_FAULT)
        s = self.armed(max_overruns=2)
        for _ in range(3):
            s.note_overrun()
        self.assertEqual(s.stop_reason, STOP_OVERRUN)

    def test_filter_clamps_when_running(self):
        s = self.armed()
        self.assertEqual(s.filter(1.7, -3.0), (1.0, -1.0))

    def test_first_stop_reason_is_kept(self):
        s = self.armed()
        s.update(1001, estop_active=True, driver_fault=True)
        self.assertEqual(s.stop_reason, STOP_ESTOP)


if __name__ == "__main__":
    unittest.main()
