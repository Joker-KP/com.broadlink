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
const Communicate = require('./../lib/Communicate.js');
const BroadlinkUtils = require('./../lib/BroadlinkUtils.js');


class BroadlinkDevice extends Homey.Device {
	constructor(...props) {
		super(...props);
		this._utils = new BroadlinkUtils(this.homey);
	}

	/**
	 * This method is called when the device is loaded, and properties such as name,
	 * capabilities and state are available.
	 * However, the device may or may not have been added yet.
	 */
	async onInit(dev) {
		let deviceSettings = this.getSettings();
		let deviceData = this.getData();

		let options = {
			ipAddress: deviceSettings.ipAddress,
			mac: this._utils.hexToArr(deviceData.mac),
			count: Math.floor(Math.random() * 0xFFFF),
			id: this._utils.hexToArr(deviceSettings.id),
			key: this._utils.hexToArr(deviceSettings.key),
			homey: this.homey
		}

		this._communicate = new Communicate()
		this._communicate.configure(options)
	}


	/**
	 * 
	 */
	authenticateDevice() {
		this._communicate.auth()
			.then((authenticationData) => {
				let newSettings = {
					key: this._utils.arrToHex(authenticationData.key),
					id: this._utils.arrToHex(authenticationData.id)
				};

				this.setSettings(newSettings)
					.then(dummy => {
						this.setSettings({ Authenticate: false })
					})
					.catch(err => {
						this._utils.debugLog('**> settings error, settings not saved *');
					})
			})
			.catch(err => {
				this._utils.debugLog('**> authentication error: ' + err);
			})
	}


	/**
	 * This method is called when the user adds the device, called just after pairing.
	 *
	 * Which means, the device has been discovered (it has an ipAddress, MAC). Now we
	 * can authenticate it to get is 'key' and 'id'
	 */
	onAdded() {

		let deviceData = this.getData();
		let options = {
			ipAddress: this.getSettings().ipAddress,
			mac: this._utils.hexToArr(deviceData.mac),
			count: Math.floor(Math.random() * 0xFFFF),
			id: null,
			key: null,
			homey: this.homey
		}
		this._communicate.configure(options)

		this.authenticateDevice();
	}

	/**
	 * This method will be called when a device has been removed.
	 */
	onDeleted() {
		this.stop_check_interval();

		this._communicate.destroy();
		this._communicate = null;
	}


	/**
	 * Called when the device settings are changed by the user
	 * (so NOT called on programmatically changing settings)
	 *
	 *  @param changedKeysArr   contains an array of keys that have been changed
	 */
	async onSettings({ oldSettings, newSettings, changedKeys }) {
		if (changedKeys.length > 0) {

			try {
				this._utils.debugLog('Settings changed:', changedKeys);
				this._utils.debugLog('Old settings:', oldSettings);
				this._utils.debugLog('New settings:', newSettings);

				changedKeys.forEach(key => {
					this._utils.debugLog(`Changed setting key: ${key}, Old value: ${oldSettings[key]}, New value: ${newSettings[key]}`);

					if (key === 'ipAddress' && newSettings.ipAddress) {
						this._utils.debugLog(`Updating IP address to ${newSettings.ipAddress}`);
						this._communicate.setIPaddress(newSettings.ipAddress);
					}
					if (key === 'CheckInterval' && newSettings.CheckInterval) {
						this._utils.debugLog(`Updating CheckInterval to ${newSettings.CheckInterval}`);
						this.stop_check_interval();
						this.start_check_interval(newSettings.CheckInterval);
					}
					if (key === 'Authenticate') {
						this._utils.debugLog('Re-authenticating device');
						this.authenticateDevice();
					}
				});
			} catch (err) {
				this._utils.debugLog('Error handling settings change: ', err);
				throw new Error('Settings could not be updated: ' + err.message);
			}
			this.log('OctoPrint settings changed:\n', changedKeys);
		}
		else {
			this.log('No settings were changed');

		}
	}

		/**
		 * Start a timer to periodically access the device. the parent class must implement onCheckInterval()
		 */
		start_check_interval(interval) {

			this.checkTimer = setInterval(function () {
				this.onCheckInterval();
			}.bind(this),
				interval * 60000);  // [minutes] to [msec]
		}


		/**
		 * Stop the periodic timer
		 */
		stop_check_interval() {
			if (this.checkTimer) {
				clearInterval(this.checkTimer)
				this.checkTimer = null
			}
		}

	}

module.exports = BroadlinkDevice;
