#
#  GoogleFindMyTools - A set of tools to interact with the Google Find My API
#  Copyright © 2024 Leon Böttger. All rights reserved.
#

class WrappedLocation:
    def __init__(
        self,
        decrypted_location,
        time,
        accuracy,
        status,
        is_own_report,
        name,
        battery_level=None,
        battery_voltage=None,
        is_charging=None,
        battery_slot=None,
    ):
        self.time = time
        self.status = status
        self.decrypted_location = decrypted_location
        self.is_own_report = is_own_report
        self.accuracy = accuracy
        self.name = name
        self.battery_level = battery_level
        self.battery_voltage = battery_voltage
        self.is_charging = is_charging
        self.battery_slot = battery_slot