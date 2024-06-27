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

const fs = require("fs");
const BroadlinkUtils = require('./../lib/BroadlinkUtils.js');

class DataStore {
  /**
   *
   * holds an Array with records:
   *    {
   *       name     [String]
   *       cmd      [Uint8Array]
   *    }
   *
   * Note: the 'name' is also stored in the device settings.
   * the Array and the Settings may have a different order of names.
   */

  /**
   * Class constructor, needed to define class-variables
   */
  
    constructor(storeName, homey) {
      this.dataArray = [];
      this.storeName = storeName;
      this._utils = new BroadlinkUtils(homey);
    }

  /**
   * @returns: -1 if not found, index-in-array otherwise
   */
  findCommand(cmdName) {
    for (var i = 0, len = this.dataArray.length; i < len; i++) {
      if (this.dataArray[i].name === cmdName) {
        return i;
      }
    }
    return -1;
  }

  /**
   * saveOnCloseEvent() is called during init and registeres the unload event. The unload
   * event is called just before the app is being closed (for instance when the app is updated,
   * homey is shutting down).
   */
  //saveOnCloseEvent() {
  //
  //   Homey.on( 'unload', function() {
  //      this._utils.debugLog(this, "unload called");
  //      this.storeCommands();
  //   });
  //}

  /**
   * saveUserData() saves the user data into a JSON file on the filesystem
   */
  storeCommands() {
    let fileName = "/userdata/" + this.storeName + ".json";
    let data;

    try {
      data = JSON.stringify(this.dataArray);
      if (!data) {
        throw new Error('JSON.stringify returned an empty string');
      }
    } catch (err) {
      this._utils.debugLog(this, `**> JSON.stringify failed: ${err.message}`);
      return; // Exit the function if data is invalid
    }

    this._utils.debugLog(this, `Storing commands to file: ${fileName}`);

    fs.writeFile(fileName, data, (err) => {
      if (err) {
        this._utils.debugLog(this, `**> Storing dataArray failed: ${err}`);
      } else {
        this._utils.debugLog(this, `**> Data successfully stored <**`);
      }
    });
  }

  /**
   * @params callback    function called once all data has been read
   */
  readCommands() {
    return new Promise((resolve, reject) => {
      let fileName = "/userdata/" + this.storeName + ".json";

      // Check if the file exists, and if it is readable and writable.
      fs.access(fileName, fs.constants.F_OK | fs.constants.W_OK | fs.constants.R_OK, (err) => {
        if (err) {
          this._utils.debugLog(null, "**> file does not exist or no access: " + err);
          return resolve();
        } else {
          fs.readFile(fileName, "utf8", (err, data) => {
            if (err) {
              this._utils.debugLog(null, "**> readFile error: " + err);
              return reject(err);
            } else {
              try {
                this.dataArray = [];
                let arr = JSON.parse(data);

                //console.log('**> JSON data parsed successfully:');
                //console.log(arr); // Debug log to see the parsed JSON data

                for (let i = 0; i < arr.length; i++) {
                  let elem = {
                    name: arr[i].name,
                    cmd: new Uint8Array(Object.values(arr[i].cmd)),
                  };
                  this.dataArray.push(elem);

                  //this._utils.debugLog(null, `**> Command ${i} added:`, elem); // Debug log for each command added
                }
                return resolve();
              } catch (err) {
                this._utils.debugLog(null, "**> parse failed: " + err);
                return reject(err);
              }
            }
          });
        }
      });
    });
  }

  /**
   *
   */
  deleteAllCommands() {
    this.dataArray = [];
    this.storeCommands();

    
				let fileName = '/userdata/' + this.storeName + '.json';
				fs.unlink( fileName, (err)  => {
					if(err) {
						this._utils.debugLog(this, '**> Cannot remove file ' + fileName + ', err = ' + err );
					}
				})
		
  }

  /**
   * @return: true if command stored, false otherwise
   */
  addCommand(cmdName, data) {
    let element = this.findCommand(cmdName);
    if (element < 0) {
      let cmd = {
        name: cmdName,
        cmd: data,
      };
      this.dataArray.push(cmd);
      this.storeCommands();
      return true;
    } else {
      return false;
    }
  }

  /**
   *
   */
  deleteCommand(cmdName) {
    //this._utils.debugLog(this, 'datastore.deleteCommand '+cmdName)
    this.dataArray = this.dataArray.filter((item) => item.name !== cmdName);
    this.storeCommands();
  }

  /**
   * @return: true if renamed, false otherwise
   */
  renameCommand(oldName, newName) {
    //this._utils.debugLog(this, 'datastore.renameCommand  old='+oldName + '  new='+newName)
    let element = this.findCommand(newName);
    if (element >= 0) {
      return false;
    }
    element = this.findCommand(oldName);
    if (element >= 0) {
      this.dataArray[element].name = newName;
      this.storeCommands();
      return true;
    } else {
      return false;
    }
  }

  /**
   * @return {Uint8Array} commanddata
   */
  getCommandData(cmdName) {
    let element = this.findCommand(cmdName);
    if (element >= 0) {
      return this.dataArray[element].cmd;
    }
    throw -1;
  }

  /**
   * Get a list of the names of all commands
   */
  getCommandNameList() {
    let lst = [];
    for (var i = 0, len = this.dataArray.length; i < len; i++) {
      lst.push(this.dataArray[i].name);
    }
    return lst;
  }
}

module.exports = DataStore;
