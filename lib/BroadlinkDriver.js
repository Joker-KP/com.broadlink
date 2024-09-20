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
const Communicate = require("./../lib/Communicate.js");
const BroadlinkUtils = require("./../lib/BroadlinkUtils.js");

class BroadlinkDriver extends Homey.Driver {
  constructor(...props) {
    super(...props);
    this._utils = new BroadlinkUtils(this.homey);
  }

  /**
   * Method that will be called when a driver is initialized.
   * @param options {Object}.CompatibilityID
   */
  onInit(options) {
    if (options) {
      this.CompatibilityID = options.CompatibilityID;
    }
    // list of devices discovered during pairing
    this.discoveredDevice = undefined;
  }

  /**
   * Set the CompatibilityID for this device
   */
  setCompatibilityID(id) {
    this.CompatibilityID = id;
  }

  /**
   * Handles the backend of the pairing sequence.
   * Communication to the frontend is done via events => socket.emit('x')
   *
   */
  onPair(session) {
    let commOptions = {
      ipAddress: null,
      mac: null,
      id: null,
      count: Math.floor(Math.random() * 0xffff),
      key: null,
      homey: this.homey,
    };
    this._communicate = new Communicate();
    this._communicate.configure(commOptions);

    session.setHandler("disconnect", async (data) => {
      try {
        this._utils.debugLog(this, "disconnect");
        data.discoveredDevice = undefined;
        data._communicate.destroy();
        data._communicate = undefined;
      } catch (err) {}
    });

    session.setHandler("start_discover", async (data) => {
      this.discoveredDevice = undefined;
      this._utils.debugLog(this, "**>onPair.start_discover: " + JSON.stringify(data));

      this._utils
        .getHomeyIp()
        .then((localAddress) => {
          // get local address without port number
          let i = localAddress.indexOf(":");
          if (i > 0) {
            localAddress = localAddress.slice(0, i);
          }
          this._utils.debugLog(this, "**>onPair.localAddress: " + localAddress);

          this._communicate
            .discover(5, localAddress, data.address)
            .then(
              (info) => {
                this._utils.debugLog(this, "**>onPair.resolved: " + JSON.stringify(info));
                var devinfo = this._utils.getDeviceInfo(info.devtype, this.CompatibilityID);
                this._utils.debugLog(this, "**>onPair.resolved deviceinfo: " + JSON.stringify(devinfo));
                var readableMac = this._utils.asHex(info.mac.reverse(), ":");
                this._utils.debugLog(this, "**>onPair.resolved readableMac: " + readableMac);
                this.discoveredDevice = {
                  device: {
                    name: devinfo.name + " (" + readableMac + ")",
                    data: {
                      name: devinfo.name,
                      mac: this._utils.arrToHex(info.mac),
                      devtype: info.devtype.toString(),
                    },
                    settings: {
                      ipAddress: info.ipAddress,
                    },
                  },
                  isCompatible: devinfo.isCompatible,
                  typeName: info.devtype.toString(16).toUpperCase(),
                };
                this._utils.debugLog(this, "**>onPair.resolved discoveredDevice: " + JSON.stringify(this.discoveredDevice));
                session.emit("discovered", this.discoveredDevice);
              },
              (rejectReason) => {
                this._utils.debugLog(this, "**>onPair.rejected: " + rejectReason);
                if (session) {
                  session.emit("discovered", null);
                }
              }
            )
            .catch((err) => {
              this._utils.debugLog(this, "**>onPair.catch: " + err);
              session.emit("discovered", null);
            });
        })
        .catch((err) => {
          this._utils.debugLog(this, "**>onPair.catch: " + err);
          session.emit("discovered", null);
        });
    });

    session.setHandler("list_devices", async () => {
      const devices = new Array({
        name: this.discoveredDevice.device.name,
        data: {
          id: this.discoveredDevice.device.data.mac,
          isCompatible: this.discoveredDevice.isCompatible,
          typeName: this.discoveredDevice.typeName,
          ...this.discoveredDevice.device.data,
        },
        settings: this.discoveredDevice.device.settings,
      });
      this._utils.debugLog(this, "==>Broadlink - list_devices: " + JSON.stringify(devices));
      return devices;
    });
  }
}

module.exports = BroadlinkDriver;
