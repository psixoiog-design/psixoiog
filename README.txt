ATLANT / ASMAN 1.50.4 — GigaChat + Resend Email 2FA

1. Запустите start.bat.
2. При запуске введите GigaChat Authorization Key (или Enter, если ИИ пока не нужен).
3. Введите подтверждённую почту владельца.
4. Введите Resend API Key вида re_... . Ключ хранится только в памяти процесса и не записывается в файлы.
5. Введите адрес отправителя Resend. Для теста можно нажать Enter и оставить onboarding@resend.dev; для постоянной работы используйте адрес на подтверждённом домене Resend.
6. Откройте http://127.0.0.1:8787

Вход владельца:
- логин + пароль;
- затем каждый раз одноразовый 6-значный код на почту;
- код действует 10 минут и используется один раз;
- после 3 неверных паролей аккаунт блокируется;
- заблокированный OWNER можно восстановить кодом с почты;
- после успешного восстановления счётчик ошибок сбрасывается.

Почтовая интеграция использует Resend Email API. Для локального теста используется onboarding@resend.dev; для постоянной работы с собственного адреса добавьте и подтвердите свой домен в Resend и задайте RESEND_SENDER_EMAIL. API-ключ не попадает в браузерный JavaScript.

Сотрудники ATLANT/ASMAN входят только по логину и паролю.

GigaChat:
- API https://api.giga.chat
- модель GigaChat-2
- OAuth https://ngw.devices.sberbank.ru:9443
- TLS-исключение ограничено только запросами GigaChat.

1.50.4: добавлена диагностика Resend. После отправки OTP нажми «Проверить доставку»: приложение покажет HTTP-код, Email ID, отправителя и замаскированного получателя. API-ключ нигде не показывается.

1.50.4: стресс-проверка импорта усилена: проверяются автор отчёта, магазин сотрудника для выплат/штрафов/другой выручки, дубликаты ID и ставок на одну дату, максимум 3 перевода и корректность сумм. Версии интерфейса и резервной копии синхронизированы.

1.50.4: усилена связность данных. Исторические ставки/выплаты без магазина применяются только при однозначной принадлежности сотрудника к одному магазину; при неоднозначности не попадают в расчёт. Импорт проверяет соответствие сотрудник-магазин для выплат, штрафов, ставок и «Другой выручки», уникальность ID выплат/штрафов и отсутствие активного+удалённого дубликата сотрудника. Процент ставки ограничен 0–100%.

CLOUD / SUPABASE
----------------
The web app now supports cloud login/load/save through the Node server.
Set SUPABASE_URL and SUPABASE_SECRET_KEY in the server environment.
The secret key is SERVER-ONLY and must never be placed in HTML/JS or exposed to users.
Supabase project: fnkmhjcfeynfjsbzigin (eu-west-1).
The browser uses only the server session token for the app's custom 3-account login.

For public deployment, deploy the Node server (not GitHub Pages alone) and set these environment variables on the host.
