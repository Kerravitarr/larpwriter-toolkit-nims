/*
Autor: Terran
*/

/**Корневой узел старинцы */
const root = '.dictionary-settings-tab ';
/** Отображение страницы.*/
const state = {};

exports.init = () => {
    initPanelsArr();
    exports.content = U.queryEl(root);
};

exports.refresh = () => {

};

function initPanelsArr() {
    state.panels = [
        {
            name: 'босы',
            /**Загрузка страницы. Может быть ссылка на другую страницу */
            load(callback) {callback();},
            /**Создать на элементе element себя, с данными - dictionary */
            make(element, dictionary) {
                U.addEl(el, makePanel(this.name, undefined, getFlags().hideAllPanels));
            }
        }
    ];
}


function makePanel(title, content) {
    const panelInfo = UI.makePanelCore(title, content);
    UI.attachPanelToggler(panelInfo.a, panelInfo.contentDiv, (event, togglePanel) => {
        togglePanel();
        //            rebuildGutter();
        UI.refreshTextAreas(`${root} #briefingContent textarea`);
    });
    panelInfo.a.click();
    return panelInfo.panel;
}
// })(window.BriefingExport = {});
