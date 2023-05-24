/*Copyright 2015 Timofey Rechkalov <ntsdk@yandex.ru>, Maria Sidekhmenova <matilda_@list.ru>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
    limitations under the License. */


/* eslint-disable func-names,prefer-rest-params */

((callback2) => {
    function profileConfigurerAPI(LocalDBMS, opts) {
        const {
            R, Constants, Errors, CU, PC
        } = opts;
        /**
         * В зависимости от типа возвращает название узла JSONа истории
         * @param {string} type тип
         * @returns массив, в котором один элемент - строка с названием узла
         */
        function getPath(type) {
            if (type === 'character') return ['CharacterProfileStructure'];
            else if (type === 'player') return ['PlayerProfileStructure'];
            else if (type === 'dictionary') return ['Guides'];
            else return null;
        }
        /**
         * Возвращает указатель на массив полей справочника
         * @param {JSON} database база данных
         * @param {string} nameDictionary название словаря
         * @returns схема словаря или undefended... Возможно
         */
        function getGudeShemeContainer(database, nameDictionary){
            let container = R.path(getPath('dictionary'), database);
            //Если справочники существуют, выбираем нужный нам
            if (container != undefined)
                container = container[nameDictionary];
            //Если такой справочник есть - то мы берём схему
            if (container != undefined)
                container = container.scheme;
            return container;
        }

        const typeCheck = type => PC.chainCheck([PC.isString(type), PC.elementFromEnum(type, Constants.profileTypes)]);
        const itemTypeCheck = type => PC.chainCheck([PC.isString(type),
        PC.elementFromEnum(type, R.keys(Constants.profileFieldTypes))]);
        const playerAccessCheck = type => PC.chainCheck([PC.isString(type),
        PC.elementFromEnum(type, Constants.playerAccessTypes)]);

        /** Возвращает набор профилей. Персонажа или Игрока 
         * @param {string} type тип - character/player
         * @returns массив, в котором каждый элемент - ProfileStructure из БД
        */
        LocalDBMS.prototype.getProfileStructure = function ({ type } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    resolve(R.clone(R.path(getPath(type), this.database)));
                });
            });
        };
        /** Возвращает набор всех справочников
         * @returns массив, в котором каждый элемент - DictionaryStructure из БД
        */
        LocalDBMS.prototype.getGuides = function ({ } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    resolve(R.clone(R.path(getPath('dictionary'), this.database)));
                });
            });
        };
        // profile configurer
        LocalDBMS.prototype.createProfileItem = function ({   type, name, itemType, selectedIndex } = {}) {
            return new Promise((resolve, reject) => {
                let chain = [typeCheck(type), PC.isString(name), PC.notEquals(name, 'name'),
                PC.isNumber(selectedIndex), itemTypeCheck(itemType)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    chain = [PC.createEntityCheck2(name, container.map(R.prop('name')), 'entity-lifeless-name', 'entity-of-profile-item'), PC.isInRange(selectedIndex, 0, container.length)];
                    PC.precondition(PC.chainCheck(chain), reject, () => {
                        const { value } = Constants.profileFieldTypes[itemType];
                        const profileItem = {
                            name,
                            type: itemType,
                            value,
                            doExport: true,
                            playerAccess: 'hidden',
                            showInRoleGrid: false
                        };

                        container.splice(selectedIndex, 0, profileItem);
                        this.ee.emit('createProfileItem', [{ type, name, itemType, value }]);
                        resolve();
                    });
                });
            });
        };
        /**
         * Создание поля справочника
         * @param {string} nameDictionary название справочника
         * @param {string} nameField название поля
         * @param {enum<Constants.profileFieldTypes>} itemType тип поля
         * @param {integer} selectedIndex положение, индекс этого поля
         * @returns 
         */
        LocalDBMS.prototype.createDictionaryItem = function ({ nameDictionary, nameField, itemType, selectedIndex } = {}) {
            return new Promise((resolve, reject) => {
                //Тестируем входные параметры
                let chain = [typeCheck('dictionary'), PC.isString(nameField), PC.notEquals(nameField, 'name'), PC.isNumber(selectedIndex), itemTypeCheck(itemType)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    //Получаем объект в котором храним нашу структуру
                    const container = getGudeShemeContainer(this.database, nameDictionary);
                    //Создание положения
                    chain = [PC.createEntityCheck2(nameField, container.map(R.prop('name')), 'entity-lifeless-name', 'entity-of-dictionary-item'), PC.isInRange(selectedIndex, 0, container.length)];
                    PC.precondition(PC.chainCheck(chain), reject, () => {
                        let { value } = Constants.profileFieldTypes[itemType];
                        //В справочниках немного различается эта графа. Возможно, когда вы это читаете, это уже не актуально... Однак пока
                        if(itemType == 'text'){
                            value = {text: '', height: -1};
                        }
                        //Создаём объект
                        const dictionaryItem = { name: nameField, type: itemType, value, doExport: true };
                        //Укладываем его
                        container.splice(selectedIndex, 0, dictionaryItem);
                        this.ee.emit('updateDictionaryItem', [{ guideName:nameDictionary, nameField: nameField, value:value }]);
                        resolve();
                    });
                });
            });
        };

        //profile configurer
        LocalDBMS.prototype.moveProfileItem = function ({ type, index, newIndex } = {}) {
            return new Promise((resolve, reject) => {
                let chain = [typeCheck(type), PC.isNumber(index), PC.isNumber(newIndex)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    chain = [PC.isInRange(index, 0, container.length - 1), PC.isInRange(newIndex, 0, container.length)];
                    PC.precondition(PC.chainCheck(chain), reject, () => {
                        if (newIndex > index) {
                            newIndex--;
                        }
                        const tmp = container[index];
                        container.splice(index, 1);
                        container.splice(newIndex, 0, tmp);
                        resolve();
                    });
                });
            });
        };
        /**
         * Сменить положение поля справочника
         * @param {string} guideName имя справочника
         * @param {integer} index старый индекс
         * @param {integer} newIndex новый индекс
         * @returns 
         */
        LocalDBMS.prototype.moveGuideItem = function ({ guideName, index, newIndex } = {}) {
            return new Promise((resolve, reject) => {
                let chain = [typeCheck('dictionary'), PC.isNumber(index), PC.isNumber(newIndex)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    chain = [PC.isInRange(index, 0, container.length - 1), PC.isInRange(newIndex, 0, container.length)];
                    PC.precondition(PC.chainCheck(chain), reject, () => {
                        if (newIndex > index) {
                            newIndex--;
                        }
                        const tmp = container[index];
                        container.splice(index, 1);
                        container.splice(newIndex, 0, tmp);
                        resolve();
                    });
                });
            });
        };

        
        // profile configurer
        LocalDBMS.prototype.removeProfileItem = function ({ type, index, profileItemName } = {}) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck(type), PC.isNumber(index), PC.isString(profileItemName)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    const els = container.map((item, i) => `${i}/${item.name}`);
                    PC.precondition(PC.entityExists(`${index}/${profileItemName}`, els), reject, () => {
                        CU.removeFromArrayByIndex(container, index);
                        this.ee.emit('removeProfileItem', arguments);
                        resolve();
                    });
                });
            });
        };

        /**
         * Удалить поле справочника
         * @param {string} guideName имя справочника
         * @param {number} index индекс поля
         * @param {string} itemName имя плоя
         * @returns 
         */
        LocalDBMS.prototype.removeGuideItem = function ({ guideName, index, itemName } = {}) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck('dictionary'), PC.isNumber(index), PC.isString(itemName)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    const els = container.map((item, i) => `${i}/${item.name}`);
                    PC.precondition(PC.entityExists(`${index}/${itemName}`, els), reject, () => {
                        CU.removeFromArrayByIndex(container, index);
                        this.ee.emit('updateDictionaryItem', [{ guideName:guideName, nameField: itemName, value:undefined }]);
                        resolve();
                    });
                });
            });
        };

        
        // profile configurer
        LocalDBMS.prototype.changeProfileItemType = function ({ type, profileItemName, newType } = {}) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck(type), PC.isString(profileItemName), itemTypeCheck(newType)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.entityExists(profileItemName, container.map(R.prop('name'))), reject, () => {
                        const profileItem = container.filter(elem => elem.name === profileItemName)[0];
                        profileItem.type = newType;
                        profileItem.value = Constants.profileFieldTypes[newType].value;
                        this.ee.emit('changeProfileItemType', arguments);
                        resolve();
                    });
                });
            });
        };
        /**
         * Сменить тип поля справочника
         * @param {string} guideName имя справочника
         * @param {string} itemName имя того поля, тип которого меняем
         * @param {enum<Constants.profileFieldTypes>} newType новый тип
         * @returns 
         */
        LocalDBMS.prototype.changeDictonaryItemType = function ({ guideName, itemName, newType } = {}) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck('dictionary'), PC.isString(itemName), itemTypeCheck(newType)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    PC.precondition(PC.entityExists(itemName, container.map(R.prop('name'))), reject, () => {
                        const profileItem = container.filter(elem => elem.name === itemName)[0];
                        profileItem.type = newType;
                        let { value } = Constants.profileFieldTypes[newType];
                        //В справочниках немного различается эта графа. Возможно, когда вы это читаете, это уже не актуально... Однак пока
                        if(newType == 'text'){
                            value = {text: '', height: -1};
                        }
                        profileItem.value = value;
                        this.ee.emit('updateDictionaryItem', [{ guideName:guideName, nameField: itemName, value:value }]);
                        resolve();
                    });
                });
            });
        };

        LocalDBMS.prototype.changeProfileItemPlayerAccess = function (
            { type, profileItemName, playerAccessType } = {}
        ) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck(type), PC.isString(profileItemName), playerAccessCheck(playerAccessType)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.entityExists(profileItemName, container.map(R.prop('name'))), reject, () => {
                        const profileStructure = R.path(getPath(type), this.database);
                        const profileItem = R.find(R.propEq('name', profileItemName), profileStructure);
                        profileItem.playerAccess = playerAccessType;
                        resolve();
                    });
                });
            });
        };

        // profile configurer
        LocalDBMS.prototype.renameProfileItem = function ({ type, newName, oldName } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.renameEntityCheck(oldName, newName, container.map(R.prop('name'))), reject, () => {
                        this.ee.emit('renameProfileItem', arguments);
                        container.filter(elem => elem.name === oldName)[0].name = newName;
                        resolve();
                    });
                });
            });
        };
        /**Изменить имя поля в справочнике
         * @param {string} guideName имя справочника
         * @param {string} itemName имя того поля, тип которого меняем
         * @param {boolean} checked таки печать? 
         * @returns 
         */
        LocalDBMS.prototype.renameGuideItem = function ({ guideName, newName, oldName } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    PC.precondition(PC.renameEntityCheck(oldName, newName, container.map(R.prop('name'))), reject, () => {
                        this.ee.emit('renameGuideItem', [{guideName:guideName, newName: newName, oldName: oldName}]);
                        container.filter(elem => elem.name === oldName)[0].name = newName;
                        resolve();
                    });
                });
            });
        };

        LocalDBMS.prototype.doExportProfileItemChange = function ({ type, profileItemName, checked } = {}) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck(type), PC.isString(profileItemName), PC.isBoolean(checked)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.entityExists(profileItemName, container.map(R.prop('name'))), reject, () => {
                        const profileItem = container.filter(elem => elem.name === profileItemName)[0];

                        profileItem.doExport = checked;
                        resolve();
                    });
                });
            });
        };
        /**Поменять свойство словаря - печать во водных
         * @param {string} guideName имя справочника
         * @param {string} itemName имя того поля, тип которого меняем
         * @param {boolean} checked таки печать? 
         * @returns 
         */
        LocalDBMS.prototype.doExportGuideItemChange = function ({ guideName, itemName, checked } = {}) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck('dictionary'), PC.isString(itemName), PC.isBoolean(checked)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    PC.precondition(PC.entityExists(itemName, container.map(R.prop('name'))), reject, () => {
                        const profileItem = container.filter(elem => elem.name === itemName)[0];
                        profileItem.doExport = checked;
                        resolve();
                    });
                });
            });
        };

        

        LocalDBMS.prototype.showInRoleGridProfileItemChange = function ({ type, profileItemName, checked } = {}) {
            return new Promise((resolve, reject) => {
                const chain = [typeCheck(type), PC.isString(profileItemName), PC.isBoolean(checked)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.entityExists(profileItemName, container.map(R.prop('name'))), reject, () => {
                        container.filter(R.pipe(R.prop('name'), R.equals(profileItemName)))[0].showInRoleGrid = checked;
                        resolve();
                    });
                });
            });
        };

        const typeSpecificPreconditions = (itemType, value) => {
            switch (itemType) {
                case 'text':
                case 'string':
                case 'checkbox':
                case 'number':
                case 'multiEnum':
                    return PC.nil();
                case 'enum':
                    return PC.isNotEmptyString(value);
                default:
                    throw new Error(`Unexpected itemType ${itemType}`);
            }
        };

        // profile configurer
        LocalDBMS.prototype.updateDefaultValue = function ({ type, profileItemName, value } = {}) {
            return new Promise((resolve, reject) => {
                let chain = [typeCheck(type), PC.isString(profileItemName)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.entityExists(profileItemName, container.map(R.prop('name'))), reject, () => {
                        const info = container.filter(R.compose(R.equals(profileItemName), R.prop('name')))[0];
                        chain = [PC.getValueCheck(info.type)(value), typeSpecificPreconditions(info.type, value)];
                        PC.precondition(PC.chainCheck(chain), reject, () => {
                            let newOptions, newOptionsMap, missedValues;

                            switch (info.type) {
                                case 'text':
                                case 'string':
                                case 'checkbox':
                                    info.value = value;
                                    break;
                                case 'number':
                                    info.value = Number(value);
                                    break;
                                case 'enum':
                                case 'multiEnum':
                                    newOptions = R.uniq(value.split(',').map(R.trim));
                                    missedValues = info.value.trim() === '' ? [] : R.difference(info.value.split(','), newOptions);
                                    newOptionsMap = R.zipObj(newOptions, R.repeat(true, newOptions.length));

                                    if (missedValues.length !== 0) {
                                        this.ee.emit(info.type === 'enum' ? 'replaceEnumValue' : 'replaceMultiEnumValue', [{type, profileItemName, defaultValue: newOptions[0], newOptionsMap}]);
                                    }

                                    info.value = newOptions.join(',');
                                    break;
                                default:
                                    reject(new Errors.InternalError('errors-unexpected-switch-argument', [info.type]));
                            }
                            resolve();
                        });
                    });
                });
            });
        };
        /**
         * Обновляет значения по умолчанию для Гайда
         * @param {string} guideName имя справочника
         * @param {string} itemName имя того поля, тип которого меняем
         * @param {enum<string,number,Array<string>>} value новые значения
         * @returns 
         */
        LocalDBMS.prototype.updateGuideDefaultValue = function ({ guideName, itemName, value } = {}) {
            return new Promise((resolve, reject) => {
                let chain = [typeCheck('dictionary'), PC.isString(itemName)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    PC.precondition(PC.entityExists(itemName, container.map(R.prop('name'))), reject, () => {
                        const info = container.filter(R.compose(R.equals(itemName), R.prop('name')))[0];
                        chain = [PC.getValueCheck(info.type)(value), typeSpecificPreconditions(info.type, value)];
                        PC.precondition(PC.chainCheck(chain), reject, () => {
                            let newOptions, newOptionsMap, missedValues;

                            switch (info.type) {
                                case 'text':
                                case 'string':
                                case 'checkbox':
                                    info.value = value;
                                    break;
                                case 'number':
                                    info.value = Number(value);
                                    break;
                                case 'enum':
                                case 'multiEnum':
                                    newOptions = R.uniq(value.split(',').map(R.trim));
                                    missedValues = info.value.trim() === '' ? [] : R.difference(info.value.split(','), newOptions);
                                    newOptionsMap = R.zipObj(newOptions, R.repeat(true, newOptions.length));

                                    if (missedValues.length !== 0) {
                                        this.ee.emit(info.type === 'enum' ? 'replaceGuideEnumValue' : 'replaceGuideMultiEnumValue', [{guideName:guideName, nameField:itemName, defaultValue: newOptions[0], newOptionsMap}]);
                                    }

                                    info.value = newOptions.join(',');
                                    break;
                                default:
                                    reject(new Errors.InternalError('errors-unexpected-switch-argument', [info.type]));
                            }
                            resolve();
                        });
                    });
                });
            });
        };

        LocalDBMS.prototype.renameEnumValue = function ({ type, profileItemName, fromValue, toValue} = {}) {
            return new Promise((resolve, reject) => {
                let chain = [typeCheck(type), PC.isString(profileItemName),
                PC.isString(fromValue), PC.isString(toValue),
                PC.isNotEmptyString(fromValue), PC.isNotEmptyString(toValue)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.entityExists(profileItemName, container.map(R.prop('name'))), reject, () => {
                        const info = container.filter(R.compose(R.equals(profileItemName), R.prop('name')))[0];
                        chain = [PC.elementFromEnum(info.type, ['enum', 'multiEnum'])];
                        PC.precondition(PC.chainCheck(chain), reject, () => {
                            const list = info.value.trim() === '' ? [] : info.value.split(',');
                            chain = [PC.elementFromEnum(fromValue, list), PC.createEntityCheck(toValue, list)];
                            PC.precondition(PC.chainCheck(chain), reject, () => {
                                list[R.indexOf(fromValue, list)] = toValue;
                                info.value = list.join(',');
                                this.ee.emit(info.type === 'enum' ? 'renameEnumValue' : 'renameMultiEnumValue', arguments);
                                resolve();
                            });
                        });
                    });
                });
            });
        };

        LocalDBMS.prototype.renameGuideEnumValue = function ({ guideName, itemName, fromValue, toValue} = {}) {
            return new Promise((resolve, reject) => {
                let chain = [typeCheck('dictionary'), PC.isString(itemName),
                PC.isString(fromValue), PC.isString(toValue),
                PC.isNotEmptyString(fromValue), PC.isNotEmptyString(toValue)];
                PC.precondition(PC.chainCheck(chain), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    PC.precondition(PC.entityExists(itemName, container.map(R.prop('name'))), reject, () => {
                        const info = container.filter(R.compose(R.equals(itemName), R.prop('name')))[0];
                        chain = [PC.elementFromEnum(info.type, ['enum', 'multiEnum'])];
                        PC.precondition(PC.chainCheck(chain), reject, () => {
                            const list = info.value.trim() === '' ? [] : info.value.split(',');
                            chain = [PC.elementFromEnum(fromValue, list), PC.createEntityCheck(toValue, list)];
                            PC.precondition(PC.chainCheck(chain), reject, () => {
                                list[R.indexOf(fromValue, list)] = toValue;
                                info.value = list.join(',');
                                this.ee.emit(info.type === 'enum' ? 'renameGuideEnumValue' : 'renameGuideMultiEnumValue', [{guideName, nameField:itemName, fromValue, toValue}]);
                                resolve();
                            });
                        });
                    });
                });
            });
        };

    }
    callback2(profileConfigurerAPI);
})(api => (typeof exports === 'undefined' ? (this.profileConfigurerAPI = api) : (module.exports = api)));
