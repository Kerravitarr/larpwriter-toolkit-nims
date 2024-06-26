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


/* eslint-disable func-names,prefer-rest-params,prefer-destructuring */

((callback2) => {
    function profilesAPI(LocalDBMS, opts) {
        const {
            R, Constants, Errors, addListener, CU, PC
        } = opts;

        /**
         * Указатель на узел в JSONе, где лежат данные
         * @param {string} type название типа
         * @returns узел, описывающий сами данные. Тут дадут реальный объект
         */
        function getPath(type) {
            if (type === 'character') return ['Characters'];
            else if (type === 'player') return ['Players'];
            else if (type === 'dictionary') return ['Guides'];
            else return null;
        }
        /**
         * Указатель на узел в JSONе, где лежит определённый тип данных
         * @param {string} type название типа
         * @returns узел. Тут дадут описание поля реального объекта
         */
        function getStructurePath(type) {
            if (type === 'character') return ['CharacterProfileStructure'];
            else if (type === 'player') return ['PlayerProfileStructure'];
            else if (type === 'dictionary') return ['DictionaryStructure'];
            else return null;
        }
        /**
         * Возвращает указатель на базу данных справочника
         * @param {JSON} database база данных
         * @param {string} nameDictionary название словаря
         * @returns словарь или undefended... Возможно
         */
        function getGudeContainer(database, nameDictionary) {
            let container = R.path(getPath('dictionary'), database);
            //Если справочники существуют, выбираем нужный нам
            if (container != undefined)
                container = container[nameDictionary];
            return container;
        }
        /**
         * Возвращает указатель на массив полей справочника
         * @param {JSON} database база данных
         * @param {string} nameDictionary название словаря
         * @returns схема словаря или undefended... Возможно
         */
        function getGudeShemeContainer(database, nameDictionary) {
            let container = getGudeContainer(database, nameDictionary);
            //Если такой справочник есть - то мы берём схему
            if (container != undefined)
                container = container.scheme;
            return container;
        }


        const typeCheck = type => PC.chainCheck([PC.isString(type), PC.elementFromEnum(type, Constants.profileTypes)]);

        LocalDBMS.prototype.getProfileNamesArray = function ({ type } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    resolve(Object.keys(R.path(getPath(type), this.database)).sort(CU.charOrdA));
                });
            });
        };

        // profile, preview
        /**Возвращает один конкретный профиль по запросу
         * 
         * @param {Enum<character,player>} type тип профиля - перс или Игрок
         * @param {string} name имя этого негодника
         * @returns Одно значение, представляющее собой запрошенный объект. Например перс с ником *
         */
        LocalDBMS.prototype.getProfile = function ({ type, name } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.entityExistsCheck(name, R.keys(container)), reject, () => {
                        resolve(R.clone(container[name]));
                    });
                });
            });
        };

        /**Возвращает один конкретный справочник
         * 
         * @param {string} guideName имя справочника
         * @returns Словарь
         */
        LocalDBMS.prototype.getGuide = function ({ guideName } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    const container = R.path(getPath('dictionary'), this.database);
                    PC.precondition(PC.entityExistsCheck(guideName, R.keys(container)), reject, () => {
                        resolve(R.clone(container[guideName]));
                    });
                });
            });
        };
        // social network, character filter
        LocalDBMS.prototype.getAllProfiles = function ({ type } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    resolve(R.clone(R.path(getPath(type), this.database)));
                });
            });
        };

        /**
         * Создаёт нового Игрока или Персонажа
         * @param {string} type тип, что именно создаёмю [character,player]
         * @param {string} characterName имя этого негодника
         */
        LocalDBMS.prototype.createProfile = function ({ type, characterName } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.createEntityCheck2(characterName, R.keys(container), 'entity-living-name', `entity-of-${type}`), reject, () => {
                        const newCharacter = {
                            name: characterName
                        };

                        R.path(getStructurePath(type), this.database).forEach((profileSettings) => {
                            if (profileSettings.type === 'enum') {
                                newCharacter[profileSettings.name] = profileSettings.value.split(',')[0];
                            } else if (profileSettings.type === 'multiEnum') {
                                newCharacter[profileSettings.name] = '';
                            } else {
                                newCharacter[profileSettings.name] = profileSettings.value;
                            }
                        });

                        R.path(getPath(type), this.database)[characterName] = newCharacter;
                        this.ee.emit('createProfile', arguments);
                        resolve();
                    });
                });
            });
        };
        /**
         * Создаёт новую запись справочника
         * @param {string} guideName имя справочника
         * @param {number} index позиция записи в справочнике
         */
        LocalDBMS.prototype.createGuideRow = function ({ guideName, index } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    const container = getGudeShemeContainer(this.database, guideName);
                    const guide = getGudeContainer(this.database, guideName);
                    const newRow = {};

                    container.forEach((struct) => {
                        if (struct.type === 'enum') {
                            newRow[struct.name] = struct.value.split(',')[0];
                        } else if (struct.type === 'multiEnum') {
                            newRow[struct.name] = '';
                        } else if (struct.type === 'text') {
                            newRow[struct.name] = { text: struct.value, height: -1 };
                        } else {
                            newRow[struct.name] = struct.value;
                        }
                    });
                    guide.rows.splice(index, 0, newRow);
                    this.ee.emit('createGuideRow', arguments);
                    resolve();
                });
            });
        };
        /**Удаляет запись справочника
         * @param {string} guideName имя справочника
         * @param {number} index позиция записи в справочнике
         */
        LocalDBMS.prototype.removeGuideRow = function ({ guideName, index } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    let guide = getGudeContainer(this.database, guideName);
                    guide.rows.splice(index, 1);
                    console.log(guide.rows);
                    this.ee.emit('removeGuideRow', arguments);
                    resolve();
                });
            });
        };



        /**
         * Создаёт новый справочник
         * @param {string} name название справочника
         */
        LocalDBMS.prototype.createGuide = function ({ name } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    const container = R.path(getPath('dictionary'), this.database);
                    PC.precondition(PC.createEntityCheck2(name, R.keys(container), 'entity-living-name', `entity-of-dictionary`), reject, () => {
                        const newGuide = {
                            name: name,
                            scheme: [],
                            rows: [],
                        };
                        R.path(getPath('dictionary'), this.database)[name] = newGuide;
                        this.ee.emit('createGuide', arguments);
                        resolve();
                    });
                });
            });
        };
        /**
         * Переименовывает Игрока или Персонажа
         * @param {string} type тип, что именно переименовываем [character,player]
         * @param {string} fromName имя, под которым объект сейчас находится в БД
         * @param {string} toName имя, которое теперь объект будет гордо носить
         * @returns 
         */
        LocalDBMS.prototype.renameProfile = function ({ type, fromName, toName } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.renameEntityCheck(fromName, toName, R.keys(container)), reject, () => {
                        const data = container[fromName];
                        data.name = toName;
                        container[toName] = data;
                        delete container[fromName];
                        this.ee.emit('renameProfile', arguments);
                        resolve();
                    });
                });
            });
        };

        /**
         * Переименовывает справочник
         * @param {string} fromName имя, под которым объект сейчас находится в БД
         * @param {string} toName имя, которое теперь объект будет гордо носить
         */
        LocalDBMS.prototype.renameGuide = function ({ fromName, toName } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    const container = R.path(getPath('dictionary'), this.database);
                    PC.precondition(PC.renameEntityCheck(fromName, toName, R.keys(container)), reject, () => {
                        const data = container[fromName];
                        data.name = toName;
                        container[toName] = data;
                        delete container[fromName];
                        this.ee.emit('renameGuide', arguments);
                        resolve();
                    });
                });
            });
        };

        /**
         * Удаляет Игрока или Персонажа
         * @param {string} type тип, что именно удаляем [character,player]
         * @param {string} characterName его имя
         * @returns 
         */
        LocalDBMS.prototype.removeProfile = function ({ type, characterName } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    PC.precondition(PC.removeEntityCheck(characterName, R.keys(container)), reject, () => {
                        delete container[characterName];
                        this.ee.emit('removeProfile', arguments);
                        resolve();
                    });
                });
            });
        };

        /**Удаляет справочник
         * @param {string} name его имя
         * @returns 
         */
        LocalDBMS.prototype.removeGuide = function ({ name } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    const container = R.path(getPath('dictionary'), this.database);
                    PC.precondition(PC.removeEntityCheck(name, R.keys(container)), reject, () => {
                        delete container[name];
                        this.ee.emit('removeGuide', arguments);
                        resolve();
                    });
                });
            });
        };

        const typeSpecificPreconditions = (itemType, itemDesc, value) => {
            switch (itemType) {
                case 'text':
                case 'string':
                case 'checkbox':
                case 'number':
                    return PC.nil();
                case 'enum':
                    return PC.elementFromEnum(value, itemDesc.value.split(','));
                case 'multiEnum':
                    return PC.eitherCheck(
                        PC.elementsFromEnum(value.split(','), itemDesc.value.split(',')),
                        PC.isEmptyString(value)
                    );
                default:
                    throw new Error(`Unexpected itemType ${itemType}`);
            }
        };

        // profile editor
        LocalDBMS.prototype.updateProfileField = function ({ type, characterName, fieldName, itemType, value } = {}) {
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck(type), reject, () => {
                    const container = R.path(getPath(type), this.database);
                    const containerStructure = R.path(getStructurePath(type), this.database);
                    const arr = [PC.entityExistsCheck(characterName, R.keys(container)),
                    PC.entityExistsCheck(
                        `${fieldName}/${itemType}`,
                        containerStructure.map(item => `${item.name}/${item.type}`)
                    ),
                    PC.getValueCheck(itemType)(value)];
                    PC.precondition(PC.chainCheck(arr), reject, () => {
                        const itemDesc = R.find(R.propEq('name', fieldName), containerStructure);
                        PC.precondition(typeSpecificPreconditions(itemType, itemDesc, value), reject, () => {
                            const profileInfo = container[characterName];
                            switch (itemType) {
                                case 'text':
                                case 'string':
                                case 'enum':
                                case 'multiEnum':
                                case 'checkbox':
                                    profileInfo[fieldName] = value;
                                    break;
                                case 'number':
                                    profileInfo[fieldName] = Number(value);
                                    break;
                                default:
                                    reject(new Errors.InternalError('errors-unexpected-switch-argument', [itemType]));
                            }
                            resolve();
                        });
                    });
                });
            });
        };
        /**Обновляет значение в строке записи справочника
         * 
         * @param {string} guideName имя справочника
         * @param {number} index позиция записи в справочнике
         * @returns 
         */
        LocalDBMS.prototype.updateGuideRowField = function ({ guideName, index, itemType, value, fieldName } = {}) {
            //Проверяем тип входного значения
            function getValueCheck(type,value) {
                switch (type) {
                    case 'checkbox':
                        return PC.isBoolean(value);
                    case 'number':
                        return PC.isNumber(value);
                    case 'text':
                        return () => (R.is(Number, value.height) ? (R.is(String, value.text) ? null : ['errors-argument-is-not-a-string', [value.text]]) : ['errors-argument-is-not-a-number', [value.height]]);
                    default:
                        return PC.isString(value);
                }
            }
            return new Promise((resolve, reject) => {
                PC.precondition(typeCheck('dictionary'), reject, () => {
                    const guide = getGudeContainer(this.database, guideName);
                    const containerStructure = getGudeShemeContainer(this.database, guideName);
                    const arr = [() => index < guide.rows.lenght,
                    PC.entityExistsCheck(
                        `${fieldName}/${itemType}`,
                        containerStructure.map(item => `${item.name}/${item.type}`)
                    ),
                    getValueCheck(itemType,value)];
                    PC.precondition(PC.chainCheck(arr), reject, () => {
                        const itemDesc = R.find(R.propEq('name', fieldName), containerStructure);
                        PC.precondition(typeSpecificPreconditions(itemType, itemDesc, value), reject, () => {
                            const row = guide.rows[index];
                            switch (itemType) {
                                case 'text':
                                case 'string':
                                case 'enum':
                                case 'multiEnum':
                                case 'checkbox':
                                    row[fieldName] = value;
                                    break;
                                case 'number':
                                    row[fieldName] = Number(value);
                                    break;
                                default:
                                    reject(new Errors.InternalError('errors-unexpected-switch-argument', [itemType]));
                            }
                            resolve();
                        });
                    });
                });
            });
        };

        /**А это дополнительная функция. Если создано новое поле у пользователя
         * то эта функция как раз обновляет всех пользователей
         * @param {string} type тип - character/player
         * @param {string} name имя поля, которое обновляется 
         * @param {enum<Constants.profileFieldTypes>} itemType тип поля
         * @param {*} value объект, который присваивается всем из набора
         */
        function _createProfileItem([{ type, name, itemType, value }] = []) {
            // throw new Error(arguments);
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                profileSet[characterName][name] = value;
            });
        }
        addListener('createProfileItem', _createProfileItem);

        function _removeProfileItem([{ type, index, profileItemName }] = []) {
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                delete profileSet[characterName][profileItemName];
            });
        }
        addListener('removeProfileItem', _removeProfileItem);

        function _changeProfileItemType([{ type, profileItemName, newType }] = []) {
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                profileSet[characterName][profileItemName] = Constants.profileFieldTypes[newType].value;
            });
        }
        addListener('changeProfileItemType', _changeProfileItemType);

        function _renameProfileItem([{ type, newName, oldName }] = []) {
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                const tmp = profileSet[characterName][oldName];
                delete profileSet[characterName][oldName];
                profileSet[characterName][newName] = tmp;
            });
        }
        addListener('renameProfileItem', _renameProfileItem);

        function _replaceEnumValue([{type, profileItemName, defaultValue, newOptionsMap }] = []) {
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                const enumValue = profileSet[characterName][profileItemName];
                if (!newOptionsMap[enumValue]) {
                    profileSet[characterName][profileItemName] = defaultValue;
                }
            });
        }
        addListener('replaceEnumValue', _replaceEnumValue);

        function _replaceMultiEnumValue([{
            type, profileItemName, defaultValue, newOptionsMap
        }] = []) {
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                let value = profileSet[characterName][profileItemName];
                if (value !== '') {
                    value = R.intersection(value.split(','), R.keys(newOptionsMap));
                    profileSet[characterName][profileItemName] = value.join(',');
                }
            });
        }
        addListener('replaceMultiEnumValue', _replaceMultiEnumValue);

        function _renameEnumValue([{ type, profileItemName, fromValue, toValue }] = []) {
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                const enumValue = profileSet[characterName][profileItemName];
                if (enumValue === fromValue) {
                    profileSet[characterName][profileItemName] = toValue;
                }
            });
        }
        addListener('renameEnumValue', _renameEnumValue);

        function _renameMultiEnumValue([{ type, profileItemName, fromValue, toValue }] = []) {
            const profileSet = R.path(getPath(type), this.database);
            Object.keys(profileSet).forEach((characterName) => {
                const value = profileSet[characterName][profileItemName];
                if (value !== '') {
                    const list = value.split(',');
                    if (R.contains(fromValue, list)) {
                        list[R.indexOf(fromValue, list)] = toValue;
                        profileSet[characterName][profileItemName] = list.join(',');
                    }
                }
            });
        }
        addListener('renameMultiEnumValue', _renameMultiEnumValue);

        /** Функция прохода по каждому элементу заданого справочника
         * 
         * @param {string} guideName имя справочника
         * @param {string} nameField имя поля, которое надо обработать
         * @param {function(*)} functionUpdate функция, которая принимает на вход текущее значение и возвращает новое
         */
        function _forEachRowGuide(database, guideName, nameField, functionUpdate) {
            const guide = R.path(getPath('dictionary'), database)[guideName];
            //И в каждой строке устанавливаем новое значение
            guide.rows.forEach(row => {
                row[nameField] = functionUpdate(row[nameField]);
            });
        }

        /**А это дополнительная функция. Если создано новое поле у справочника
         * то эта функция как раз обновляет все записи
         * тоже самое с удалением поля и обновлением типа
         * 
         * @param {string} type тип - character/player
         * @param {string} name имя поля, которое обновляется 
         * @param {enum<Constants.profileFieldTypes>} itemType тип поля
         * @param {*} value объект, который присваивается всем из набора
         */
        function _updateDictionaryItem([{ guideName, nameField, value }] = []) {
            console.log(value);
            _forEachRowGuide(this.database, guideName,nameField, (old) => {return value} );
        }
        function _renameGuideItem([{guideName, newName, oldName }] = []) {
            const guide = R.path(getPath('dictionary'), this.database)[guideName];
            //И в каждой строке устанавливаем новое значение
            guide.rows.forEach(row => {
                const tmp = row[oldName];
                delete row[oldName];
                row[newName] = tmp;
            });
        }
        function _replaceGuideEnumValue([{ guideName, nameField, defaultValue, newOptionsMap }] = []) {
            _forEachRowGuide(this.database, guideName,nameField, (old) => {return newOptionsMap[old] ? old : defaultValue;} );
        }
        function _replaceGuideMultiEnumValue([{ guideName, nameField, defaultValue, newOptionsMap }] = []) {
            _forEachRowGuide(this.database, guideName,nameField, (old) => {return old === '' ? old : R.intersection(old.split(','), R.keys(newOptionsMap)).join(',');} );
        }
        function _renameGuideEnumValue([{ guideName, nameField, fromValue, toValue}] = []) {
            _forEachRowGuide(this.database, guideName,nameField, (old) => {return old !== fromValue ? old : toValue;} );
        }
        function _renameGuideMultiEnumValue([{ guideName, nameField, fromValue, toValue}] = []) {
            _forEachRowGuide(this.database, guideName,nameField, (old) => {
                if(old === ''){
                    return old;
                } else {
                    const list = old.split(',');
                    if (R.contains(fromValue, list)) {
                        list[R.indexOf(fromValue, list)] = toValue;
                        return list.join(',');
                    } else {
                        return old;
                    }
                }
            } );
        }

        addListener('updateDictionaryItem', _updateDictionaryItem); 
        addListener('renameGuideItem', _renameGuideItem);
        addListener('replaceGuideEnumValue', _replaceGuideEnumValue);
        addListener('replaceGuideMultiEnumValue', _replaceGuideMultiEnumValue);
        addListener('renameGuideEnumValue', _renameGuideEnumValue);
        addListener('renameGuideMultiEnumValue', _renameGuideMultiEnumValue);
    }

    callback2(profilesAPI);
})(api => (typeof exports === 'undefined' ? (this.profilesAPI = api) : (module.exports = api)));
