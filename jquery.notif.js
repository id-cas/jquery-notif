(function () {

	// контейнер для всех оповещаний
	KalkPro.notifsWrapper = document.getElementById('js--notifications');
	KalkPro.notifsCSS = {};

	// шаблон
	const NOTIF_TEMPLATE =
		'<div id="js--notif-{{id}}" class="notif notif--hidden">\
			<div class="notif__body box box--notif box--{{type}}">\
				{{#closeButton}}<button class="notif__close btn btn--M btn--menu btn--one2one btn--ico-l btn--white i-times js--onclick-hideNotif"></button>{{/closeButton}}\
				{{#closeAgreementButton}}<button class="notif__close btn btn--M btn--menu btn--one2one btn--ico-l btn--blue i-times js--onclick-hideNotif  js--onclick-cookiePolicyAgree"></button>{{/closeAgreementButton}}\
				{{#heading}}<h4 class="notif__heading rh rh--medium rh--inline">{{{heading}}}</h4>{{/heading}}\
				{{#content}}<div class="notif__content">{{{content}}}</div>{{/content}}\
			</div>\
		</div>';

	// время анимации
	const ANIMATION_SPEED = 100;
	const ANIMATION_TYPE = 'linear';

	/**
	 * Класс для работы с сообщениями и уведомлениями.
	 * @param {Object} options
	 * */
	var Notif = function (options) {
		var self = this;

		// DOM-узел, с которым будет осуществляться работа (в $-обертке)
		self.node = null;

		// настройки
		self.settings = {

			// заголовк
			heading: '',

			// содержимое
			content: '',

			// тип сообщения (danger, info)
			type: 'info',

			// иконка fontawesome
			icon: 'info',

			// айди
			id: (new Date()).getTime(),

			// время жизни
			lifetime: Infinity,

			// задержка перед показом
			delay: 0,

			// "тихий" режим - сообщение не выводится, пока не произойдет вызов
			silent: false,

			// Скрыть оповещение
			closeButton: true,
			// Закрыть и больше не показывать соглашение Cookie
			closeAgreementButton: false,

			// коллбек, по готовности
			ready: function () {},

			// коллбек, по факту завершения отображения
			complete: function () {}
		};

		// уведомления о куках в куках
		var agreementCookie = parseInt(cookier('kalkpro-cookie-policy-agreement'));

		// исправляем контент, делаем списком, если надо
		if (isArray(options.content)) {
			var temp = [];

			for (var i = 0; i < options.content.length; i++) {
				if (temp.indexOf(options.content[i].text) === -1) {
					temp.push(options.content[i].text || options.content[i]);
				}
			}

			// количество сообщений > 1
			if (temp.length > 1) {
				// уведомления о куках
				var agreementIndex = temp.indexOf('cookies::agreement');
				// присутствует в контенте, создаём отдельное уведомление под это
				if (agreementIndex !== -1) {
					// копируем настройки
					var _options = JSON.parse(JSON.stringify(options));
					// контент
					_options.content = temp[agreementIndex];
					// создаем отдельное уведомление под это дело
					notificate(_options);

					// удаляем сообщение о куках
					temp.splice(agreementIndex, 1);
					// выставляем контент
					options.content = temp;
					// запускаем уведомление в текущем контексте заново
					// на этом прирываемся, сюда повторно попасть не должны
					return notificate(options);
				}
				// создаем список сообщений
				else {
					options.content = '<ul><li>'+ temp.join('</li><li>') + '</li></ul>';
				}
			}
			// одно сообщение
			else {
				options.content = temp.join('');
			}
		}

		// применение внешних настроек (перезапись)
		Object.assign(self.settings, options);

		// исправление внешних настроек
		if (!/info|danger|success|yellow|bordered|basket/.test(self.settings.type)) {
			self.settings.type = 'info';
		}

		// исправление внешних настроек
		self.settings.heading = (self.settings.heading ? self.settings.heading : null);
		self.settings.content = (self.settings.content ? self.settings.content : null);

		// использование куки - формируем сообщение здесь
		// если встретили вызов сообщения с текстом "cookies::agreement"
		self.isCookieAgreement = false;
		if (self.settings.content === 'cookies::agreement') {
			// останавливаем уведомление, уже принимали
			if (agreementCookie) {
				return;
			}
			// останавливаем уведомление, виджет
			if (globals.isWidget) {
				return;
			}
			// останавливаем уведомление, если находимся в корзине на странице оплат
			if(window.location.pathname.search(RegExp('\/emarket\/checkout\/')) !== -1){
				return;
			}

			self.settings.type = 'no-icon box--bordered';
			self.settings.heading = '';

			self.isCookieAgreement = true;
			self.settings.content =
				'<section style="font-size:0.7rem">' +
					'<noindex>' +
						'<p><strong>' + getLabel('agreement.header') + '</strong></p>' +
						'<p>' +
							'<ul>' +
								'<li>' + getLabel('agreement.condition-cookies') + '</li>' +
								'<li>' + getLabel('agreement.condition-user-agreement') + '</li>' +
								'<li>' + getLabel('agreement.condition-norms') + '</li>' +
							'</ul>' +
						'</p>' +
					'</noindex>' +
				'<section>';
			self.settings.closeButton = false;
			self.settings.closeAgreementButton = true;
		}

		// Кастомный враппер
		if (self.settings.wrapper) {
			self.wrapper = document.querySelector(self.settings.wrapper);
		}

		/** Запуск */
		if (!self.isCookieAgreement) {
			self.init();
		}
		else{
			// Уведомлять будем только после того как загрузится Яндекс.Метрика и пользователь провдет на сайте
			// необходимое количество времени (typeof yaCounter28925455 !== 'undefined')
			window.yandexMetrikaLoadedHdr = setInterval(function(){
				// Если условия обработки куки были приняты в соседнем окне
				if(parseInt(cookier('kalkpro-cookie-policy-agreement'))) {
					clearInterval(window.yandexMetrikaLoadedHdr);

					// Прервем обработку, чтобы не дублировать показ
					return;
				}

				// Яндекс.Метрика загрузилась
				if(typeof window.yaCounter28925455 !== 'undefined'){
					clearInterval(window.yandexMetrikaLoadedHdr);

					// Отложенный показ уведомления о принятии условий обработки куков
					setTimeout(function(){
						self.init();
					}, 5 * 1000);
				}
			}, 100);
		}
	};

	/**
	 * Запуск уведомления.
	 * @return void
	 * */
	Notif.prototype.init = function () {
		// верстка
		this.node = Mustache.renderFromTemplate(NOTIF_TEMPLATE, this.settings, 'notif' + this.settings.id);

		// создание узла
		this.node = $(this.node);

		// экземпляр
		this.node.get(0).notif = this;

		var wrapper;

		// Заданный враппер
		if (nodeExists(this.wrapper)) wrapper = this.wrapper;

		// Общий враппер
		else if (nodeExists(KalkPro.notifsWrapper)) wrapper = KalkPro.notifsWrapper;

		if (wrapper) {

			// Помещаем увед во враппер
			$(wrapper).append(this.node);

			// Применяем доп CSS
			this.node.css(KalkPro.notifsCSS);
		} else {
			console.error('> Can\'t create notification: wrapper element is not found.');
			return;
		}

		// показ сообщения
		this.autoShow();
	};

	/**
	 *
	 * */
	Notif.prototype.autoShow = function () {
		var self = this;

		if (!self.settings.silent) {
			setTimeout(function () {
				self.show();
				self.settings.ready.call(self);
				self.autoHide();
			}, self.settings.delay);
		}
	};

	/**
	 *
	 * */
	Notif.prototype.autoHide = function () {

		var self = this;

		if (self.settings.lifetime !== Infinity && self.settings.lifetime > 0) {
			setTimeout(function () {
				self.hide();
				self.settings.complete.call(self);
			}, self.settings.lifetime);
		}
	};

	/**
	 * @return void
	 * */
	Notif.prototype.show = function () {
		if (this.node && (this.node.is(':hidden') || this.node.hasBEMMod('hidden'))) {
			this.node.show().removeBEMMod('hidden').addBEMMod('visible');
		}
	};

	/**
	 *
	 * */
	Notif.prototype.hide = function () {
		var self = this;

		if (self.node) {
			self.node.animate({ opacity: 0 }, ANIMATION_SPEED, ANIMATION_TYPE, function () {
				self.node.hide();
			});
		}
	};


	/**
	 *
	 * */
	Notif.prototype.destroy = function () {

		var self = this;

		if (self.node) {
			self.node.remove();
			self.settings = null;
			self.node = null;
		}

		return null;
	};

	window.notificate = function (options) {
		return new Notif(options);
	};

	if (KalkPro.notifs && KalkPro.notifs.length) {
		log('Showing '+ KalkPro.notifs.length +' waiting notification(s)...');
		for (var i = 0; i < KalkPro.notifs.length; i++) {
			notificate(KalkPro.notifs[i]);
		}
	}

	$(document)
		.on('click', '.js--onclick-hideNotif', function (event) {
			event.preventDefault();

			$(this).closest('.notif').get(0).notif.hide();
		})
		.on('click', '.js--onclick-cookiePolicyAgree', function (event) {
			event.preventDefault();

			cookier('kalkpro-cookie-policy-agreement', 1, 365);
		})
	;

})();