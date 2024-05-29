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

const Homey = require('homey');
const BroadlinkUtils = require('./../../lib/BroadlinkUtils.js');
const BroadlinkDevice = require('./../../lib/BroadlinkDevice');


class SP2Device extends BroadlinkDevice {


	generate_trigger_nightlight(mode) {
		if (mode != this.getCapabilityValue('onoff.nightlight')) {
			let drv = this.driver;
			drv.trigger_nightlight_toggle.trigger(this, {}, {})
			if (mode) {
				drv.trigger_nightlight_on.trigger(this, {}, {})
			}
			else {
				drv.trigger_nightlight_off.trigger(this, {}, {})
			}
		}
	}

	generate_trigger_power(mode) {
		if (mode != this.getCapabilityValue('onoff.power')) {
			let drv = this.driver;
			drv.trigger_power_toggle.trigger(this, {}, {})
			if (mode) {
				drv.trigger_power_on.trigger(this, {}, {})
			}
			else {
				drv.trigger_power_off.trigger(this, {}, {})
			}
		}
	}


	async onCheckInterval() {
		try {
			this._utils.debugLog(this, 'onCheckInterval called');
			let energy = await this.get_energy()
			this._utils.debugLog(this, `Energy reading: ${energy}`);
			this.setCapabilityValue('measure_power', energy);

			let response = await this._communicate.read_status()

			let state = ((response[0] == 2) || (response[0] == 3))
			this.generate_trigger_nightlight(state);
			this.setCapabilityValue('onoff.nightlight', state);

			state = ((response[0] == 1) || (response[0] == 3));
			this.generate_trigger_power(state);
			this.setCapabilityValue('onoff.power', state);
        } catch (e) {
            this.error('Error in onCheckInterval', e);
        }
	}


	/**
	 *
	 */
	async get_energy() {
		try {
			let response = await this._communicate.sp2_get_energy();
			let energy = response[3] * 256 + response[2] + (response[1] / 100.0);
			return energy;
        } catch (e) {
            this.error('Error in get_energy', e);
            return 0;
		}
	}


	/**
	 * Returns the night light state of the smart plug.
	 */
	async check_nightlight() {
		try {
			let response = await this._communicate.read_status()
			return ((response[0] == 2) || (response[0] == 3));
        } catch (e) {
            this.error('Error in check_nightlight', e);
            return false;
		}
	}


	/**
	 *
	 */
	async adjust_nightlight(state) {
		let onoff = await this.check_power()
		let level = 0
		if (onoff) {
			level = state ? 3 : 1;
		}
		else {
			level = state ? 2 : 0;
		}
		await this._communicate.setPowerState(level)
		return true;
	}


	/**
	 * Returns the power state of the smart plug.
	 */
	async check_power() {
		try {
			let response = await this._communicate.read_status()
			this._utils.debugLog(this, `Power status response: ${response}`);
			return ((response[0] == 1) || (response[0] == 3));
        } catch (e) {
            this.error('Error in check_power', e);
            return false;
		}
	}


	/**
	 * Sets the power state of the smart plug.
	 */
	async adjust_power(state) {
		this._utils.debugLog(this, `adjust_power called with state: ${state}`);
		let onoff = await this.check_nightlight()
		let level = 0;
		if (onoff) {
			level = state ? 3 : 2;
		}
		else {
			level = state ? 1 : 0;
		}
		await this._communicate.setPowerState(level);
		return true;
	}

	/**
	 *
	 */
	async set_power(mode) {
		this.generate_trigger_power(mode);
		try {
			await this.adjust_power(mode)
        } catch (e) {
            this.error('Error in set_power', e);
        }
	}


	/**
	 *
	 */
	async set_nightlight(mode) {
		this.generate_trigger_nightlight(mode);
		try {
			this.adjust_nightlight(mode)
        } catch (e) {
            this.error('Error in set_nightlight', e);
        }
	}


	check_condition_power_on() {
		return Promise.resolve(this.check_power());
	}

	check_condition_nightlight_on() {
		return Promise.resolve(this.check_nightlight());
	}


	do_action_power_on() {
		this.set_power(true)
		this.setCapabilityValue('onoff.power', true);
		return Promise.resolve(true)
	}

	do_action_power_off() {
		this.set_power(false);
		this.setCapabilityValue('onoff.power', false);
		return Promise.resolve(true)
	}

	do_action_nightlight_on() {
		this.set_nightlight(true)
		this.setCapabilityValue('onoff.nightlight', true)
		return Promise.resolve(true)
	}

	do_action_nightlight_off() {
		this.set_nightlight(false)
		this.setCapabilityValue('onoff.nightlight', false)
		return Promise.resolve(true)
	}

	onCapabilityPowerOnOff(mode) {
		this.set_power(mode)
		return Promise.resolve()
	}

	onCapabilityNightLightOnOff(mode) {
		this.set_nightlight(mode)
		return Promise.resolve()
	}

	async onInit() {
		super.onInit();
		this.registerCapabilityListener('onoff.power', this.onCapabilityPowerOnOff.bind(this));
		this.registerCapabilityListener('onoff.nightlight', this.onCapabilityNightLightOnOff.bind(this));
	
		// Read the interval value from checkinterval.json
		const driverSettings = this.driver.getSettings();
		const checkIntervalMinutes = driverSettings.CheckInterval || 5; // Default to 5 minutes if not set
		const checkIntervalMillis = checkIntervalMinutes * 60 * 1000; // Convert minutes to milliseconds
	
		this._utils.debugLog(this, `Setting check interval to ${checkIntervalMinutes} minutes (${checkIntervalMillis} milliseconds)`);
		
		// Set up interval to check power readings based on the interval from settings
		this.checkInterval = setInterval(this.onCheckInterval.bind(this), checkIntervalMillis);
	
		// Initial call to get power readings
		this.onCheckInterval();
	}

	onDeleted() {
		this.log("Device deleted: " + this.getData().id);
	
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
		}
	}

}

module.exports = SP2Device;
