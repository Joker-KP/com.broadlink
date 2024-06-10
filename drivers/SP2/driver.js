/**
 * Driver for Broadlink devices
 *
 * Copyright 2018-2019, R Wensveen
 *
 * This file is part of com.broadlink
 * com.broadlink is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * com.broadlink is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with com.broadlink.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

const Homey = require("homey");
const BroadlinkDriver = require("./../../lib/BroadlinkDriver");
const BroadlinkUtils = require("./../../lib/BroadlinkUtils.js");

class BroadlinkSP2Driver extends BroadlinkDriver {
  check_condition_power_on(args, state) {
    return args.device.check_condition_power_on();
  }

  check_condition_nightlight_on(args, state) {
    return args.device.check_condition_nightlight_on();
  }

  do_action_power_on(args, state) {
    return args.device.do_action_power_on();
  }

  do_action_power_off(args, state) {
    return args.device.do_action_power_off();
  }

  do_action_nightlight_on(args, state) {
    return args.device.do_action_nightlight_on();
  }

  do_action_nightlight_off(args, state) {
    return args.device.do_action_nightlight_off();
  }

  async onInit() {
    super.onInit({
      CompatibilityID: 0x2711 // SP2
    });

    this.trigger_power_toggle = this.homey.flow.getDeviceTriggerCard("sp2_onoff_power");
    this.trigger_power_on = this.homey.flow.getDeviceTriggerCard("sp2_onoff_power_on");
    this.trigger_power_off = this.homey.flow.getDeviceTriggerCard("sp2_onoff_power_off");

    this.trigger_nightlight_toggle = this.homey.flow.getDeviceTriggerCard("sp2_onoff_nightlight");
    this.trigger_nightlight_on = this.homey.flow.getDeviceTriggerCard("sp2_onoff_nightlight_on");
    this.trigger_nightlight_off = this.homey.flow.getDeviceTriggerCard("sp2_onoff_nightlight_off");

    this.condition_power_on = this.homey.flow.getConditionCard("sp2_onoff_power_on");
    this.condition_power_on.registerRunListener(this.check_condition_power_on.bind(this));

    this.condition_nightlight_on = this.homey.flow.getConditionCard("sp2_onoff_nightlight_on");
    this.condition_nightlight_on.registerRunListener(this.check_condition_nightlight_on.bind(this));

    this.action_power_on = this.homey.flow.getActionCard("sp2_onoff_power_on");
    this.action_power_on.registerRunListener(this.do_action_power_on.bind(this));

    this.action_power_off = this.homey.flow.getActionCard("sp2_onoff_power_off");
    this.action_power_off.registerRunListener(this.do_action_power_off.bind(this));

    this.action_nightlight_on = this.homey.flow.getActionCard("sp2_onoff_nightlight_on");
    this.action_nightlight_on.registerRunListener(this.do_action_nightlight_on.bind(this));

    this.action_nightlight_off = this.homey.flow.getActionCard("sp2_onoff_nightlight_off");
    this.action_nightlight_off.registerRunListener(this.do_action_nightlight_off.bind(this));
  }
}

module.exports = BroadlinkSP2Driver;
