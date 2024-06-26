//const R = require('ramda');
const dateFormat = require('dateformat');

module.exports = function (imports) {
    const exports = {};
    const BACKUP_NUMBER = 4;
    const BACKUP_INTERVAL = 60000 * 10; // 10 min

    exports.runBaseSelectDialog = function () {
        const dbDialog = U.queryEl('.set-database-dialog');
        U.addEl(U.queryEl('body'), dbDialog);
        U.listen(U.qee(dbDialog, '.on-action-button'), 'click', (event) => {
            $(dbDialog).modal('hide');
        });

        exports.readLocalBases().then((browserBases) => {
            U.addEls(U.qee(dbDialog, '.modal-body .backup-bases'), (browserBases || []).map((base, i) => {
                const baseSelect = U.qmte('.backup-base-tmpl');
                const input = U.qee(baseSelect, 'input');
                U.setAttr(input, 'value', `browserBackup${i}`);
                U.setAttr(input, 'id', `dbSourceBrowserBackup${i}`);
                input.base = base;
                U.setAttr(U.qee(baseSelect, 'label'), 'for', `dbSourceBrowserBackup${i}`);
                const date = dateFormat(new Date(base.Meta.saveTime), 'dd mmm yyyy HH:MM:ss');
                U.addEl(U.qee(baseSelect, '.base-name'), U.makeText(`${base.Meta.name} (${date})`));
                return baseSelect;
            }));

            U.qee(dbDialog, 'input[name=dbSource]').checked = true;
            U.qee(dbDialog, '#dbSourceDemoBase').base = R.clone(imports.DemoBase.data);
            U.qee(dbDialog, '#dbSourceEmptyBase').base = R.clone(imports.EmptyBase.data);

            U.addEl(U.qee(dbDialog, '.demo-base-name'), U.makeText(imports.DemoBase.data.Meta.name));

            const dialogOnBaseLoad = (err) => {
                if (err) { UI.handleError(err); return; }
                $(dbDialog).modal('hide');
                imports.onBaseLoaded(err);
            };

            imports.initBaseLoadBtn(U.qee(dbDialog, '.upload-db'), U.qee(dbDialog, '.upload-db input'), dialogOnBaseLoad);

            U.listen(U.qee(dbDialog, '.on-action-button'), 'click', () => {
                const { base } = U.getSelectedRadio(dbDialog, 'input[name=dbSource]');
                DBMS.setDatabase({ database: base }).then(() => {
                    dialogOnBaseLoad();
                }).catch(UI.handleError);
            });

            L10n.localizeStatic(dbDialog);

            $(dbDialog).modal({
                backdrop: 'static'
            });
        }).catch(err => console.error(err));
    };
    /** Загружает базы данных из памяти браузера
     * 
     * @returns списко баз данных из памяти браузера
     */
    exports.readLocalBases = function() {
        if (!window.indexedDB) {
            UI.alert(L10n.get('errors', 'indexeddb-is-not-found'));
            return Promise.resolve(null);
        }

        let counter = 0;
        const counters = [];
        while (!R.contains(counter, counters)) {
            counters.push(counter);
            counter = (counter + 1) % BACKUP_NUMBER;
        }

        return Promise.all(counters.map(counter2 => imports.LocalBackupCore.get(`base${counter2}`))).then((bases) => {
            bases = bases.filter(base => !R.isNil(base));
            if (bases.length === 0) {
                return null;
            }

            bases.sort(CU.charOrdAFactory(base => -new Date(base.obj.Meta.saveTime).getTime()));
            return bases.map(R.prop('obj'));
        });
    }

    function localAutoSave() {
        if (!window.indexedDB) {
            return;
        }

        makeBackup();
        setInterval(makeBackup, BACKUP_INTERVAL); // 5 min
    }
    exports.localAutoSave = localAutoSave;
    //Счётчик, сколько БД уже в памяти
    let counter = 0;
    //Создаёт отпечаток базы в памяти браузера
    function makeBackup() {
        console.log(counter + 1);
        counter = (counter + 1) % BACKUP_NUMBER;
        console.log('Starting autosave');

        DBMS.getDatabase().then((database) => {
            imports.LocalBackupCore.put(`base${counter}`, database).then(() => {
                console.log(`Autosave OK ${new Date()}`);
                //                LocalBackupCore.get('base' + counter).then((database) => {
                //                    console.log(database);
                //                }).catch(UI.handleError);
            }).catch(UI.handleError);
        }).catch(UI.handleError);
    }
    exports.makeBackup = makeBackup;
    return exports;
};
