/*Copyright 2017 Timofey Rechkalov <ntsdk@yandex.ru>, Maria Sidekhmenova <matilda_@list.ru>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
    limitations under the License. */


((callback2) => {
    function textSearchAPI(LocalDBMS, opts) {
        const { R, Constants, Errors, CU, PC} = opts;

        //type SearchFunction = (textType:sting, test, database) => string[];
        /**Объект, где каждое поле - функция поиска в базе данных 
         * @type {v: SearchFunction} 
        */
        const searchers = {};

        //        LocalDBMS.prototype.getTextsTest = function(searchStr, textTypes, caseSensitive, callback){
        //            var errPrint = function(err){
        //                console.log(err);
        //            };
        //            var okPrint = function(){
        //                console.log('OK');
        //            };
        //            this.getTexts(123, null, null, errPrint, okPrint);
        //            this.getTexts('23', true, null, errPrint, okPrint);
        //            this.getTexts('23', ['window'], null, errPrint, okPrint);
        //            this.getTexts('23', [], '123', errPrint, okPrint);
        //            callback('test result');
        //        };

        //  [
        //      {
        //          name: 'searchStr',
        //          check: [{
        //              type: 'isString'
        //          }]
        //      },
        //      {
        //          name: 'textTypes',
        //          check: [{
        //              type: 'isArray',
        //              subtype: 'string'
        //          }, {
        //              type: 'elementsFromEnum',
        //              arr: (searchers) => R.keys(searchers)
        //          }]
        //      },
        //      {
        //          name: 'caseSensitive',
        //          check: [{
        //              type: 'isBoolean'
        //          }]
        //      },
        //  ]
        // eslint-disable-next-line func-names
        /**Ищет текст во всех объектах
         * @param {{searchStr: string, textTypes:Array<string>, caseSensitive:boolean}} - искомый текст
         * @param {string} searchStr - искомый текст
         * @param {Array<string>} textTypes - список объектов в которых ищем текст
         * @param {boolean} caseSensitive - регистро зависимый поиск?
         * @returns {Promise<{textType:string,result:Array<{name:string,type:'text'|'string',text:string}>}>} объект в виде вектора, в котором записаны все найденые строки
         */
        LocalDBMS.prototype.getTexts = function ({ searchStr, textTypes, caseSensitive } = {}) {
            return new Promise((resolve, reject) => {
                const textTypesPrecondition = PC.elementsFromEnum(R.__, R.keys(searchers));
                const check = PC.chainCheck([PC.isString(searchStr), PC.isArray(textTypes),
                    textTypesPrecondition(textTypes), PC.isBoolean(caseSensitive)]);
                PC.precondition(check, reject, () => {
                    let test;
                    if (caseSensitive) {
                        test = text => (text.indexOf(searchStr) !== -1);
                    } else {
                        searchStr = searchStr.toLowerCase();
                        test = text => (text.toLowerCase().indexOf(searchStr) !== -1);
                    }
                    resolve(textTypes.map(textType => ({
                        textType,
                        result: searchers[textType](textType, test, this.database)
                    })));
                });
            });
        };
        /**Функция форматирования найденого текста
         * @param {string} name заголовок, где нашли?
         * @param {string} type тип... Поддерживатеся только text/string... Тогда зачем? О_О
         * @param {string} text текст, который нашли
         * @returns 
         */
        const format = (name, type, text) => ({
            name,
            type,
            text
        });

        searchers.writerStory = (textType, test, database) => R.values(database.Stories)
            .filter(story => test(story.story))
            .map(story => format(story.name, 'text', story.story));

        searchers.eventOrigins = (textType, test, database) => R.flatten(R.values(database.Stories)
            .map(story => story.events
                .filter(event => test(event.text))
                .map(event => format(`${story.name}/${event.name}`, 'text', event.text))));

        searchers.eventAdaptations = (textType, test, database) => R.flatten(R.values(database.Stories)
            .map(story => story.events
                .map(event => R.keys(event.characters)
                    .filter(char => test(event.characters[char].text))
                    .map(char => format(
                        `${story.name}/${event.name}/${char}`, 'text',
                        event.characters[char].text
                    )))));

        const profileSearch = R.curry((profiles, structure, textType, test, database) => {
            const items = database[structure].filter(item => item.type === 'string' || item.type === 'text');
            return R.flatten(R.values(database[profiles])
                .map(profile => items.filter(item => test(profile[item.name]))
                    .map(item => format(`${profile.name}/${item.name}`, item.type, profile[item.name]))));
        });
        searchers.characterProfiles = profileSearch('Characters', 'CharacterProfileStructure');
        searchers.playerProfiles = profileSearch('Players', 'PlayerProfileStructure');

        searchers.relations = (textType, test, database) => {
            let relations = R.clone(database.Relations);
            relations = relations.map(R.omit(R.difference(Constants.relationFields, ['origin']))).map((rel) => {
                R.difference(R.keys(rel), ['origin']).forEach((key, i) => {
                    rel[`char${i}`] = key;
                });
                return rel;
            });
            return R.flatten(relations.map(rel => [
                format(`${rel.char0}/${rel.char1}`, 'text', rel[rel.char0]),
                format(`${rel.char0} ? ${rel.char1}`, 'text', rel.origin),
                format(`${rel.char1}/${rel.char0}`, 'text', rel[rel.char1]),
            ])).filter(obj => test(obj.text));
        };

        searchers.groups = (textType, test, database) => {
            const groups = database.Groups;
            return R.flatten(R.values(groups).map((group) => {
                const arr = [];
                if (test(group.masterDescription)) {
                    arr.push(format(`${group.name}/writer`, 'text', group.masterDescription));
                }
                if (test(group.characterDescription)) {
                    arr.push(format(`${group.name}/character`, 'text', group.characterDescription));
                }
                return arr;
            }));
        };
        /**Функция поиска в гайде
         * @param {string} textType текущий тип.
         * @param {(string) => string} test функция соответствия слов
         * @param {db} database вся база данных
         * @returns {Array<format>}
         */
        searchers.guidesSearch = (textType, test, database) => {
            const guides = database.Guides;
            const getText = (row_value) =>{
                if(typeof row_value == "string"){
                    return row_value;
                } else if(row_value.text != undefined){
                    return row_value.text;
                } else {
                    return null;
                }
            };
            return R.flatten(R.values(guides).map((guide) => {
                return guide.rows.map((r, index) => {
                    const transform = [];
                    for (let fieldName in r) {
                        if (r.hasOwnProperty(fieldName))
                            transform.push({row: r, name:fieldName, value: r[fieldName], index:index});
                    }
                    return transform;
                }).flat().filter(o =>{
                    const text = getText(o.value);
                    if(text == null) return false;
                    else return test(text);
                }).map(o => format(`${guide.name} / №${o.index + 1} / ${o.name}`, 'text', getText(o.value)));
            }));
        }
    }
    callback2(textSearchAPI);
})(api => (typeof exports === 'undefined' ? (this.textSearchAPI = api) : (module.exports = api)));
