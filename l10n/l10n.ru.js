﻿Dictionaries['ru'] = {
    "header": {
        "page-title": "НИМС набор инструментов мастера сюжетника",
        "overview":"Обзор",
        "characters":"Персонажи",
        "stories":"Истории",
        "adaptations":"Адаптации",
        "briefings":"Вводные",
        "timeline":"Хронология",
        "social-network":"Социальная сеть",
        "character-filter":"Фильтр",
        "open-database":"Загрузить базу из файла",
        "save-database":"Сохранить базу на диск",
        "create-database":"Создать новую базу",
        "docs":"Документация",
        "admins":"Администрирование",
        "chat":"Чат",
        "logout":"Выход",
        "test":"Тест",
        "about":"О нас",
        "logViewer":"Логи",
        "l10n":"Русский",
        "dictionary-icon":"ru",
        "briefing-preview" : "Предварительный просмотр",
        "briefing-export" : "Экспорт",
        "character-profile" : "Досье",
        "character-profile-configurer" : "Редактор досье",
        "master-story" : "Мастерская история",
        "story-events" : "События",
        "story-characters" : "Персонажи",
        "event-presence" : "Присутствие",
    },
    "common": {
        "rename-from":"Переименовать из",
        "to":"в",
        "ok":"ОК",
        "add":"Добавить",
        "remove":"Удалить",
        "on": "на",
        "set-item-before" : "Перед '{0}'",
        "set-item-as-last" : "В конец",
    },
    "constant": {
        "yes":"Да",
        "no": "Нет",
        // social network subsets
        "allObjects" : "Все объекты",
        "selectedCharacters": "Избранные персонажи",
        "selectedStories": "Избранные истории",
        // social network types
        //"simpleNetwork"            : "Простая сеть",
        "socialRelations"          : "Социальные связи",
        "characterPresenceInStory" : "Персонаж-участие-история",
        "characterActivityInStory" : "Персонаж-активность-история",
        // no group
        "noGroup": "Без групп" ,
        // activities
        "active"    : "Актив" ,
        "follower"  : "Спутник" ,
        "defensive" : "Защита" ,
        "passive"   : "Пассив" ,
        // number filter
        "ignore" : "Не важно",
        "greater" : "Больше",
        "equal" : "Равно",
        "lesser" : "Меньше",
        // adaptations labels
        "finishedText" : "Описание завершено",
        "finishedSuffix" : "(завершено)",
        "emptySuffix" : "(пусто)",
        // profile item types
        "text":"Текст",
        "string":"Строка",
        "enum":"Единственный выбор", // single choice
        "number":"Число",
        "checkbox":"Галочка",
    },
    "overview": {
        "descr":"Описание",
        "diagrams":"Диаграммы",
        "name":"Название",
        "pre-game-start-date":"Дата начала доигровых событий",
        "pre-game-end-date":"Дата окончания доигровых событий",
        "stats":"Статистика",
        "story-count":"Количество историй",
        "character-count":"Количество персонажей",
        "event-count":"Количество событий",
        "user-count":"Количество пользователей",
        "first-event":"Первое событие",
        "last-event":"Последнее событие",
        "symbol-count":"Количество знаков в текстах (без пробелов)",
        "story-completeness":"Завершенность историй",
        "general-completeness":"Общая завершенность",
        "event-count-diagram":"Количество событий в историях",
        "character-count-diagram":"Количество персонажей в историях",
        "story-completeness-diagram":"Детальная завершенность историй",
        "object-belonging-diagrams":"Принадлежность объектов",
        "characters-diagram":"Персонажи",
        "stories-diagram":"Истории",
        "story-completeness-value":'{0}% ({1} из {2} историй)',
        "general-completeness-value": '{0}% ({1} из {2} адаптаций)',
        'consistency-problem-detected': "Проверка данных выявила нарушение целостности базы, пожалуйста свяжитесь с разработчиками для устранения проблемы.",
        'last-save-time': 'Время последнего сохранения базы',
    },
    "characters": {
        "character-managing":"Управление персонажами",
        "character-name":"Имя персонажа",
        "new-character-name":"Новое имя персонажа",
        "profile":"Досье",
        "profile-editor":"Редактор досье",
        "characters":"Персонажи",
        "profile-item-name":"Название",
        "profile-item-type":"Тип",
        "profile-item-position":"Позиция",

        "move-item":"Переместить",
        "table-profile-item-name":"Название поля",
        "profile-item-default-value":"Значения",
        "profile-item-do-export":"Печатать во вводных",
        
        // character management errors
        "character-name-is-not-specified" : "Имя персонажа не указано",
        "new-character-name-is-not-specified" : "Новое имя не указано.",
        "names-are-the-same" : "Имена совпадают.",
        "character-name-already-used" : "Имя {0} уже используется.",
        "are-you-sure-about-character-removing" : "Вы уверены, что хотите удалить {0}? Все данные связанные с персонажем будут удалены безвозвратно.",

        // profile configurer errors
        "unknown-profile-item-type" : "Неизвестный тип поля: {0}",
        "profile-item-positions-are-equal": "Позиции полей совпадают",
        "are-you-sure-about-removing-profile-item": "Вы уверены, что хотите удалить поле профиля {0}? Все данные связанные с этим полем будут удалены безвозвратно.",
        "not-a-number":"Введено не число",
        "enum-item-cant-be-empty":"Значение поля с единственным выбором не может быть пустым",
        "new-enum-values-remove-some-old-values": "Новое значение единственного выбора удаляет предыдущие значения: {0}. Это приведет к обновлению существующих профилей. Вы уверены?",
        "profile-item-name-is-not-specified": "Название поля не указано",
        "profile-item-name-cant-be-name": "Название поля не может быть name",
        "such-name-already-used": "Такое имя уже используется",
        "are-you-sure-about-changing-profile-item-type":"Вы уверены, что хотите изменить тип поля профиля {0}? Все заполнение данного поле в досье будет потеряно.",
    },
    "character-filter": {
        "show-profile-item":"Отобразить поле",
        "filter":"Фильтр",
        "results":"Результатов:",
        "character":"Персонаж",

    },
    "stories":{
        "stories":"Истории",
        "story-management":"Управление историями",
        "story-name":"Название истории",
        "new-story-name":"Новое название истории",
        "event-creation": "Создание события",
        "event-name": "Название",
        "event-descr": "Описание события",
        "event-position": "Позиция",
        "event-management": "Управление событиями",
        "move-event": "Переместить",
        "clone-event": "Клонировать",
        "merge-events": "Объединить со следующим",
        "story-character-management": "Управление персонажами",
        "replace-character": "Заменить",
        "inventory": "Инвентарь",
        "name": "Имя",
        "activity": "Активность",
        "show-characters": "Отобразить персонажей",
        "event":"Событие",
        "remove-character-from-event-warning":"Вы уверены, что хотите удалить персонажа {0} из события '{1}'? У этого песонажа есть адаптация события, которая будет удалена безвозвратно.",
        //story management errors
        "story-name-is-not-specified" : "Название истории не указано.",
        "new-story-name-is-not-specified" : "Новое имя не указано.",
        "names-are-the-same" : "Имена совпадают.",
        "story-name-already-used" : "Имя {0} уже используется.",
        "are-you-sure-about-story-removing" : "Вы уверены, что хотите удалить историю {0}? Все данные связанные с историей будут удалены безвозвратно.",
        // story characters errors
        "character-name-is-not-specified":"Имя персонажа не указано",
        "one-of-switch-characters-is-not-specified":"Имя одного из персонажей не указано",
        "remove-character-from-story-warning":"Вы уверены, что хотите удалить персонажа {0} из истории? Все данные связанные с персонажем будут удалены безвозвратно.",
        // story event management
        "event-name-is-not-specified" : "Название события не указано",
        "event-text-is-empty" : "Событие пусто",
        "event-positions-are-the-same" : "Позиции событий совпадают",
        "cant-merge-last-event" : "Выбранное событие объединяется со следующим событием. Последнее событие не с кем объединять.",
        "remove-event-warning" : "Вы уверены, что хотите удалить событие {0}? Все данные связанные с событием будут удалены безвозвратно.",
    },
    "adaptations":{
        "show-only-unfinished-stories": "Показывать\n только незавершенные истории",
        "story": "История",
        "filter": "Фильтр",
        "by-characters": "По персонажам",
        "by-events": "По событиям",
        "characters": "Персонажи",
        "events": "События",
        "adaptations": "Адаптации",
        "origin": "Оригинал",
        "adaptation": "Адаптация",
    },
    "admins":{
        "user-management": "Управление пользователями",
        "user-name": "Имя",
        "user-password": "Пароль",
        "change-password": "Сменить пароль",
        "special-actions": "Специальные действия",
        "admin": "Администратор:",
        "assign-admin": "Назначить администратором",
        "editor": "Редактор:",
        "remove-editor": "Удалить редактора",
        "assign-editor": "Назначить редактора",
        "assign-adaptation-rights": "Назначение прав на адаптации",
        "by-stories": "По историям",
        "by-characters": "По персонажам",
        "editing-rights": "Права на редактирование",
        "rights": "Права",
        "characters": "Персонажи",
        "stories": "Истории",
        "users": "Пользователи",
        "assign-rights": "Назначить права",
        "take-away-rights": "Забрать права",
        "characters-header" : "Персонажи",
        'stories-header' : "Истории",
        'have-not-owner' : "Не привязаны",
        'user-name-is-not-specified' : "Имя пользователя не указано",
        'password-is-not-specified' : "Пароль не указан",
        'user-already-exists' : "Такой пользователь уже существует",
        'confirm-user-remove' : "Вы уверены, что хотите удалить {0}?",
        'user-is-not-selected' : "Пользователь не выбран",
        'confirm-admin-assigment' : "Вы уверены, что хотите назначить пользователя {0} администратором? Отменить это действие вы не сможете.",
        'confirm-editor-assigment' : "Вы уверены, что хотите назначить пользователя {0} редактором? Пока назначен редактор все другие пользователи не смогут редактировать свои объекты.",
        'function-must-be-overriden-on-server': "Функция {0} должна быть определена на сервере.",
    },
    "briefings":{
        "settings": "Настройки",
        "group-by-story": "Группировать события по историям",
        "sort-by-timeline": "Сортировать события по хронологии",
        "export-mode": "Режим выгрузки",
        "each-briefing-to-own-file": "Каждую вводную в отдельный файл",
        "briefing-selection": "Выбор вводных",
        "print-all": "Выгрузить все вводные",
        "print-partly": "Выгрузить часть вводных",
        "briefings-amount": "Количество выгружаемых вводных",
        "briefings-range": "Диапазон выгружаемых вводных",
        "simple-export": "Простая выгрузка",
        "advanced-docx-export": "Продвинутая выгрузка docx",
        "advanced-txt-export": "Продвинутая текстовая выгрузка",
        "make-docx-by-time": "Сформировать вводные, события сгруппированны по времени (docx)",
        "make-docx-by-stories": "Сформировать вводные, события сгруппированны по историям (docx)",
        "make-txt": "Сформировать вводные txt",
        "make-inventory": "Сформировать список инвентаря (docx)",
        "upload-template-and-make-export": "Загрузить шаблон и сформировать вводные",
        "template": "Шаблон",
        "enter-text-file-type": "Введите тип сохраняемого текста (txt, html, rst и др.)",
        "preview": "Предварительный просмотр",
        "raw-data": "Исходные данные",
        "export": "Выгрузить",
        "exported-text": "Выгруженный текст",
        "export-status": "Статус выгрузки",
        "error-on-template-uploading": "Ошибка при загрузке файла",
        "error-on-generating-briefings": "Ошибка во время генерации вводных",
        "convert-to-docx-template":"Конвертировать в docx шаблон",
        "generate-by-docx-template":"Сгенерировать в docx по текущему шаблону",
        "exact-multiselect": "Точный мультивыбор",
        "export-settings": "Настройки экспорта",
        // breifings preview
        "inventory":'Инвентарь',
        "unlock-event-source":"Разблокировать редактирование оригинала события",
        "hide-all-panels" : "Свернуть все панели",
        "disable-headers" : "Отключить заголовки",
        'profile': 'Досье',
        'events-header':'Событие {0}-{1}',
        'story-header':'История {0}',
        'event-header':'Событие {0}',
        'subjective-time':"Субъективное время: ",
        // export status
        "save-preparing" : "Подготовка к выгрузке.",
        "start-saving": "Данные подготовлены. Начинаю выгрузку.",
        "save-status": "Выгружено {0} из {1}.",
        "archiving": "Данные выгружены. Архивирую.",
        "archive-is-ready": "Архив готов.",
        "save-archive": "Архив сформирован. Сохраняем?",
        "file-is-ready": "Файл выгружен.",
        "save-file": "Документ сформирован. Сохраняем?",
    },
    "timeline":{
        "stories": "Истории",
    },
    "social-network":{
        "show-node": "Показать узел:",
        "common-settings": "Общие настройки",
        "color-nodes": "Раскраска узлов",
        "legend": "Легенда",
        "selection": "Выборка",
        "characters": "Персонажи",
        "stories": "Истории",
        "story":"История",
        "private-settings": "Частные настройки",
        "social-network": "Социальная сеть",
        "activity": "Активность",
        "draw": "Нарисовать",
        "hide-panel": "Спрятать панель",
        "require-resources-warning":"Внимание! Отрисовка социальной сети требует большого количества ресурсов. Рекомендуем сохранить данные перед отрисовкой.",
        "remove-resources-warning":"Убрать предупреждение",
    },
    "utils":{
        "close-page-warning": "Убедитесь, что сохранили данные. После закрытия страницы все несохраненные изменения будут потеряны.",
        "new-base-warning": "Вы уверены, что хотите создать новую базу? Все несохраненные изменения будут потеряны.",
        "base-file-loading-error": "Ошибка при загрузке файла"
    }, 
    "log-viewer" : {
        "page" : "Страница",
        "date" : "Дата",
        "user" : "Пользователь",
        "action" : "Действие",
        "params" : "Параметры",
    }
};

