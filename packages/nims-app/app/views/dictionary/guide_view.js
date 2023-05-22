/*
Autor: Terran
*/

/**Корневой узел старинцы */
const root = '.guide-view-tab ';
/**Текущий выбранный словарь, у которого создаём поля */
let selectDictonagy = undefined;

exports.init = () => {
    exports.content = U.queryEl(root);

    //Слушаем событие добавления записей
    U.listen(U.queryEl(`${root} .create`), 'click', () => newGuideRow());
};


exports.refresh = () => {
    const content = U.clearEl(U.queryEl(`${root} .entity-list`));
    Promise.all([
        DBMS.getGuides({})
    ]).then((results) => {
        const [guides] = results;
        const allGuides = Object.entries(guides);
        //Сортируем словари по имени
        allGuides.sort(([p1, a], [p2, b]) => a.name.localeCompare(b.name));

        //Показать предупреждение, если нет справочников
        U.hideEl(U.queryEl(`${root} .alert-no-guides`), allGuides.length !== 0);
        U.hideEl(U.queryEl(`${root} .guide-panel`), allGuides.length === 0);
        //Разершить поиск, если справочники есть
        UI.enableEl(U.queryEl(`${root}.entity-filter`), allGuides.length > 0);

        allGuides.forEach(([nameGuide, guide]) => {
            const el = U.wrapEl('div', U.qte(`${root} .entity-item-tmpl`));
            U.addEl(U.qee(el, '.primary-name'), U.makeText(nameGuide));
            U.setAttr(el, 'primary-name', nameGuide);
            //Свойство по которому будем выделять словари
            U.setAttr(el, 'guide-name', nameGuide);
            U.listen(U.qee(el, '.select-button'), 'click', () => selectGuide(guide));
            U.setAttr(U.qee(el, '.rename'), 'title', L10n.getValue('dictionary-item_field_rename'));
            const removeBtn = U.qee(el, '.remove');
            U.setAttr(removeBtn, 'title', L10n.getValue('dictionary-item_field_remove'));

            U.listen(U.qee(el, '.rename'), 'click', () => {
                //Диалог переименовния словаря
                const renameGuideDialog = UI.createModalDialog(
                    root,
                    renameGuide, {
                    bodySelector: 'modal-prompt-body',
                    dialogTitle: `dictionary-rename_title`,
                    actionButtonTitle: 'common-rename',
                });
                U.qee(renameGuideDialog, '.entity-input').value = renameGuideDialog.fromName = guide.name;
                renameGuideDialog.showDlg();
            });
            U.listen(removeBtn, 'click', () => {
                UI.confirm(CU.strFormat(L10n.getValue('dictionary-remove_text'), [guide.name]), () => {
                    DBMS.removeGuide({ name: guide.name }).then(() => {
                        if (guide === selectDictonagy)
                            selectDictonagy = undefined;
                        exports.refresh();
                    }).catch(UI.handleError);
                });
            });
            //Обновляем ссылку на справочник... Я чувствую, что начинаю лажать
            if (selectDictonagy == undefined || selectDictonagy.name == guide.name)
                selectDictonagy = guide;

            U.addEl(content, el);
        });
        if (selectDictonagy != undefined)
            selectGuide(selectDictonagy);
    }).catch(UI.handleError);
};
/**Выбрали словарь.
 * 
 * @param {*} guide словарь, который надо отобразить 
 */
function selectGuide(guide) {
    console.log(guide);
    selectDictonagy = guide;
    //Скрываем панель, если справочника не будет
    U.hideEl(U.queryEl(`${root} .guide-panel`), guide === null);

    if (guide === null) {
        return;
    }
    U.hideEl(U.queryEl(`${root} .alert-no-items`), guide.rows.length != 0);
    //Показать предупреждение, если нет записей
    //Очищаем все выделения старые
    U.queryEls(`${root} [guide-name] .select-button`).map(U.removeClass(R.__, 'btn-primary'));
    //Выделяем по новой
    const el = U.queryEl(`${root} [guide-name="${guide.name}"] .select-button`);
    U.addClass(el, 'btn-primary');

    const parentEl = el.parentElement.parentElement;
    const entityList = U.queryEl(`${root} .entity-list`);
    UI.scrollTo(entityList, parentEl);

    //А теперь попробуем позаполнять табличку
    const table = U.clearEl(U.queryEl('#guideRow'));

    U.showEl(table, guide.rows.length !== 0);

    R.ap([U.addEl(table)], guide.rows.map(row => appendRowToTable(guide.scheme, row)));
}
/**Создаёт новую строку в справочнике
 * 
 * @param {*} guide справочник, строка которого создаётся
 */
function newGuideRow() {
    DBMS.createGuideRow({ guideName: selectDictonagy.name, index: selectDictonagy.rows.length }).then(() => {
        exports.refresh();
    }).catch((err) => UI.setError(dialog, err));
}
/**Сооружает строку таблицы и возвращает её
 * 
 * @param {*} scheme схема по которой раскрывается строка
 * @param {*} row строка, которую мы хотим отобразить
 * @returns 
 */
function appendRowToTable(scheme, row) {
    //Создаём нашу строку
    const el = U.wrapEl('tr', U.qte(`${root} .guide-row-tmpl`));
    //И русифицируем её
    L10n.localizeStatic(el);
    const panel = U.qee(el, '.guide-div');
    //А теперь для каждого элемента строки
    scheme.forEach(obj => {
        let input, sel, toNameObj,multiEnumSelect;
        switch (obj.type) {
            case 'text':
                input = U.makeEl('textarea');
                U.addClass(input, 'profileTextInput');
                break;
            case 'string':
                input = U.makeEl('input');
                U.addClass(input, 'profileStringInput');
                break;
            case 'enum':
                input = U.makeEl('select');
                U.addClass(input, 'profileSelectInput');
                toNameObj = R.compose(R.zipObj(['name']), R.append(R.__, []));
                U.fillSelector(input, R.sort(CU.charOrdA, obj.value.split(',')).map(toNameObj));
                break;
            case 'number':
                input = U.makeEl('input');
                input.type = 'number';
                break;
            case 'checkbox':
                input = U.makeEl('input');
                input.type = 'checkbox';
                break;
            case 'multiEnum':
                multiEnumSelect = $('<select></select>');
                U.setAttr(multiEnumSelect[0], 'style', 'width: 100%;');
                U.addClass(multiEnumSelect[0], 'common-select');
                U.addClass(multiEnumSelect[0], 'profileStringInput');
                [input] = $('<span></span>').append(multiEnumSelect);
                U.setAttr(multiEnumSelect[0], 'multiple', 'multiple');

                sel = multiEnumSelect.select2(U.arr2Select2(R.sort(CU.charOrdA, obj.value.split(','))));
                //sel.on('change', this.updateFieldValue.bind(this));
                break;
            default:
                throw new Errors.InternalError('errors-unexpected-switch-argument', [obj.type]);
        }

        if (obj.type !== 'multiEnum') {
            //U.listen(input, 'change', this.updateFieldValue.bind(this));
            U.addClass(input, 'form-control');
        }
        if(obj.type === 'text'){
            let label = U.makeEl('label');
            U.addClass(label, 'col-xs-11 control-label');
            U.addEl(label, U.makeText(obj.name + ': '));
            U.addEl(panel, label);
            U.addEl(panel, input);
        } else {
            input.value = row[obj.name];
            let grupe = U.makeEl('div');
            U.addClass(grupe, 'form-group');
            let label = U.makeEl('label');
            U.addClass(label, 'col-xs-1 control-label');
            U.addEl(label, U.makeText(obj.name + ': '));
            U.addEl(grupe, label);
            let divInput = U.makeEl('div');
            U.addClass(divInput, 'col-xs-11 form-control-static');
            U.addEl(divInput, input);
            U.addEl(grupe, divInput);
            U.addEl(panel, grupe);
        }
    });

    //const qe = U.qee(el,'');
    /*  const nameInput = qe('.event-name-input');
      nameInput.value = event.name;
      nameInput.eventIndex = index;
      U.listen(nameInput, 'change', updateEventName);
  
      const textInput = qe('.event-text');
      textInput.value = event.text;
      textInput.eventIndex = index;
      U.listen(textInput, 'change', updateEventText);
  
      UI.makeEventTimePicker2(qe('.event-time'), {
          eventTime: event.time,
          index,
          preGameDate,
          date,
          onChangeDateTimeCreator
      });
  
      U.listen(U.qee(el, '.move'), 'click', () => {
          state.moveEventDialog.index = index;
          state.moveEventDialog.showDlg();
      });
  
      U.listen(U.qee(el, '.clone'), 'click', cloneEvent(index));
      if (state.eventsLength === index + 1) {
          U.setAttr(U.qee(el, '.merge'), 'disabled', 'disabled');
      } else {
          U.listen(U.qee(el, '.merge'), 'click', mergeEvents(index, event.name, events[index + 1].name));
      }
      U.listen(U.qee(el, '.remove'), 'click', removeEvent(event.name, index));
  */
    return el;
}

/**Генератор функции, которая будет выбрана при нажатии кнопки переименовании словаря
 * 
 * @param {*} dialog 
 * @returns 
 */
function renameGuide(dialog) {
    return () => {
        const toInput = U.qee(dialog, '.entity-input');
        const { fromName } = dialog;
        const toName = toInput.value.trim();

        DBMS.renameGuide({ fromName, toName }).then(() => {
            toInput.value = '';
            dialog.hideDlg();
            exports.refresh();
        }).catch((err) => UI.setError(dialog, err));
    };
}

// })(window.BriefingExport = {});
