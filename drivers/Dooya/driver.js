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


class DooyaDriver extends BroadlinkDriver {


	check_condition_closed(args, state) {
		return args.device.check_condition_closed()
	}

	do_action_close(args, state) {
		return args.device.do_action_close()
	}

	do_action_open(args, state) {
		return args.device.do_action_open()
	}

	do_action_toggle(args, state) {
		return args.device.do_action_toggle()
	}

	async onInit() {
		super.onInit({
			CompatibilityID: 0x4E4D   // DOOYA
		});

		this.trigger_open = this.homey.flow.getDeviceTriggerCard('dooya_opened')
		this.trigger_closed = this.homey.flow.getDeviceTriggerCard('dooya_closed')

		this.condition_closed = this.homey.flow.getConditionCard('dooya_closed')
			.registerRunListener(this.check_condition_closed.bind(this))

		this.action_close = this.homey.flow.getActionCard('dooya_close')
			.registerRunListener(this.do_action_close.bind(this))
		this.action_open = this.homey.flow.getActionCard('dooya_open')
			.registerRunListener(this.do_action_open.bind(this))
		this.action_toggle = this.homey.flow.getActionCard('dooya_toggle')
			.registerRunListener(this.do_action_toggle.bind(this))
	}


	/**
	 * Handles the backend of the pairing sequence.
	 * Communication to the frontend is done via events => socket.emit('x')
	 *
	 */
	onPair(session) {
		super.onPair(session);
		//this._utils.debugLog('dooya.onPair')

		session.setHandler('properties_set', async (data) => {
			// data = { 'deviceList': deviceData }

			data['deviceList'][0]['capabilities'] = [
				"windowcoverings_closed",
				"button.open",
				"button.close",
				"button.stop"
			]

			return data['deviceList'];
		});
	}

}
module.exports = DooyaDriver;
