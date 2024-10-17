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

'use strict';

const BroadlinkDriver = require('./../../lib/BroadlinkDriver');

const DeviceInfo = require("./../../lib/DeviceInfo.js");
const BroadlinkType = DeviceInfo.BroadlinkType;

class BroadlinkMP1Driver extends BroadlinkDriver {

	mp1_check_condition_on(args, state) {
		return args.device.check_condition_on(args.switchID);
	}

	mp1_do_action_on(args, state) {
		return args.device.do_action_on(args.switchID)
	}

	mp1_do_action_off(args, state) {
		return args.device.do_action_off(args.switchID)
	}


	async onInit() {
		super.onInit({
			//CompatibilityID: 0x4EB5 // MP1
			CompatibilityID: BroadlinkType.MP1
		});

		this.trigger_toggle = this.homey.flow.getDeviceTriggerCard('mp1_onoff_change')
			.registerRunListener(async (args, state) => {
				return args.switchID === state.switchID;
			});

		this.trigger_on = this.homey.flow.getDeviceTriggerCard('mp1_onoff_on')
			.registerRunListener(async (args, state) => {
				return args.switchID === state.switchID;
			});

		this.trigger_off = this.homey.flow.getDeviceTriggerCard('mp1_onoff_off')
			.registerRunListener(async (args, state) => {
				return args.switchID === state.switchID;
			});

		this.mp1_condition_on = this.homey.flow.getConditionCard('mp1_onoff');
		this.mp1_condition_on
			.registerRunListener(this.mp1_check_condition_on.bind(this));

		this.mp1_action_on = this.homey.flow.getActionCard('mp1_onoff_on');
		this.mp1_action_on
			.registerRunListener(this.mp1_do_action_on.bind(this));

		this.mp1_action_off = this.homey.flow.getActionCard('mp1_onoff_off');
		this.mp1_action_off
			.registerRunListener(this.mp1_do_action_off.bind(this));
	}


}

module.exports = BroadlinkMP1Driver;
