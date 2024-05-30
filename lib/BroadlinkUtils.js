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

//const Log = require('homey-log').Log;
const DeviceInfo = require('./DeviceInfo');

/*
 * homey-log sends error reports to Sentry.IO
 * in env.js its DSN is defined.
 * log in to Sentry.IO with your github account to view the events.
 */

class BroadlinkUtils {
	constructor(homey) {
		this.homey = homey;
	}

	epochToTimeFormatter(epoch) {
		if (epoch == null) epoch = new Date().getTime()
		return (new Date(epoch)).toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, '$1')
	}

	concatTypedArrays(a, b) {
		if (!a || !b) {
			this.debugLog(null, "Invalid array inputs for concatenation", { a, b });
			return new Uint8Array(); // return an empty Uint8Array
		}
		var c = new (a.constructor)(a.length + b.length);
		c.set(a, 0);
		c.set(b, a.length);
		return c;
	}

	hexDigit(b) {
		const nibble = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
		let l = (b) & 0x0F;
		let h = (b >> 4) & 0x0F;
		return '' + nibble[h] + nibble[l];
	}

	asHex(arr, separator) {
		if (!arr) {
			this.debugLog(null, "Invalid array input for hex conversion", arr);
			return ""; // return an empty string
		}
		if (separator == null) { separator = ","; }
		var s = Array(arr.length);
		for (var i = 0; i < arr.length; i++) {
			s[i] = this.hexDigit(arr[i]);
		}
		return Array.apply([], s).join(separator);
	}

	arrToHex(arr) {
		if (!arr) {
			this.debugLog(null, "Invalid array input for hex conversion", arr);
			return ""; // return an empty string
		}
		var s = Array(arr.length);
		for (var i = 0; i < arr.length; i++) {
			s[i] = this.hexDigit(arr[i]);
		}
		return Array.apply([], s).join("");
	}

	hexToArr(str) {
		if (!str) {
			this.debugLog(null, "Invalid string input for array conversion", str);
			return new Uint8Array(); // return an empty Uint8Array
		}
		for (var bytes = [], c = 0; c < str.length; c += 2) {
			bytes.push(parseInt(str.slice(c, c + 2), 16));
		}
		return new Uint8Array(bytes);
	}

	getHomeyIp() {
		return new Promise((resolve, reject) => {
			this.homey.cloud.getLocalAddress()
				.then(localAddress => {
					return resolve(localAddress)
				})
				.catch(error => {
					this.debugLog(null, "Error getting Homey IP address", error);
					reject(error);
				});
		});
	}

	debugLog(device, message, data) {
		const deviceDetails = device && typeof device.getData === 'function'
			? `${device.getData().name} (Type: ${device.getData().devtype})`
			: 'Broadlink';
	
		const logMessage = `[${deviceDetails}] ${message}`;
		
		// Check if the 'homey' and 'settings' are available in the device context
		if (device.homey && device.homey.settings) {
			const settings = device.homey.settings.get('DebugSettings');
			if (settings && settings['logging']) {
				console.log(`${this.epochToTimeFormatter()} ${logMessage}`, data || '');
			}
			if (settings && settings['errorreport']) {
				Log.captureMessage(`${logMessage} ${data || ''}`);
			}
		} else {
			// Fallback logging if settings are not available
			console.log(`${this.epochToTimeFormatter()} ${logMessage}`, data || '');
		}
	}

	getDeviceInfo(founddevID, expecteddevID) {
		var foundInfo = DeviceInfo.devType2Info(founddevID);
		var expectedInfo = DeviceInfo.devType2Info(expecteddevID);

		if (foundInfo.type == expectedInfo.type) { foundInfo.isCompatible = true; }

		let s = this.homey.settings.get('DebugSettings');
		if ((s) && (s['compat'])) {
			foundInfo.isCompatible = true;
		}
		this.debugLog(null, `getDeviceInfo: found = 0x${founddevID.toString(16)}  expected = 0x${expecteddevID.toString(16)}  isComp = ${foundInfo.isCompatible}`);

		return foundInfo;
	}
}

module.exports = BroadlinkUtils;
