# Government J.H. College Betul Events — कॉलेज Handover Checklist

यह checklist source code प्राप्त करने वाले कॉलेज IT/DBA/admin के लिए है। इसमें website को deploy नहीं किया गया है। वास्तविक `.env`, passwords, JWT secret, database credentials और छात्र records source package में शामिल नहीं होने चाहिए।

## 1. Source package प्राप्त करना

- [ ] `JH-College-Events-Handover.zip` प्राप्त कर सुरक्षित college-managed storage में रखें।
- [ ] ZIP में source, tests, `Dockerfile`, `.dockerignore`, `backend/.env.example`, `README.md`, `DATABASE-SCHEMA-REVIEW.md` और यह checklist होने की पुष्टि करें।
- [ ] `backend/.env` या कोई वास्तविक password, token, private key, database dump अथवा छात्र data package में नहीं होना चाहिए।
- [ ] `backend/migrations/0001_account_schema.proposed.sql` केवल DBA review के लिए है—इसे execute न करें।

## 2. कॉलेज से policy approvals

- [ ] कॉलेज नाम/logo, रंग, event text और photos उपयोग करने की लिखित अनुमति।
- [ ] तय करें कि छात्र public registration कर सकते हैं या registration को college records से verify करना होगा।
- [ ] public student directory में नाम और semester दिखाने की अनुमति, consent, correction और deletion प्रक्रिया।
- [ ] पुष्टि करें कि teacher, principal और admin में से कौन event बना, edit, publish/unpublish और delete कर सकता है; क्या event ownership या approval चाहिए?
- [ ] staff account बनाने, initial admin नियुक्त करने, password reset, deactivation और access review के जिम्मेदार व्यक्ति तय करें।
- [ ] photo consent, captions, image retention और backup से deletion की अवधि/प्रक्रिया तय करें।
- [ ] hosting/server, domain, backup, incident response और account-data access का college owner तय करें। यह परियोजना अभी deploy नहीं की गई है।

## 3. DBA से database schema और अनुमति

- [ ] DBA से `users` और `students` की authoritative, versioned PostgreSQL DDL या migration प्राप्त करें।
- [ ] columns/types, nullability/defaults, primary/foreign keys, unique constraints/indexes और role values की पुष्टि करें।
- [ ] email uniqueness/normalization, semester/gender values, roll-number uniqueness, bcrypt hash compatibility और account status rules तय करें।
- [ ] event/gallery DDL को authoritative schema के साथ review करें। Repository का `backend/initDb.js` केवल event settings, events, annual albums और photos बनाता है; account tables नहीं।
- [ ] testing के लिए नया, खाली `jhcollege_events_test` database और अलग non-superuser role केवल DBA की स्पष्ट अनुमति के बाद बनाएँ।
- [ ] पुष्टि करें कि test database में college/production records नहीं हैं। Test account/data synthetic हों।
- [ ] test database पर approved account schema apply करने और guarded initializer चलाने की स्पष्ट स्वीकृति लें।
- [ ] database-backed tests और browser acceptance tests चलाकर actual परिणाम दर्ज करें।
- [ ] किसी भी स्थिति में review-only proposed SQL production या college database पर न चलाएँ।

विस्तृत, DBA को भेजने योग्य अनुरोध और column evidence `DATABASE-SCHEMA-REVIEW.md` में हैं। Safe local test setup, environment variables और test-only admin instructions `README.md` में हैं।

## 4. Local setup (केवल स्वीकृत isolated test database)

- [ ] Supported Node.js LTS और PostgreSQL client install करें; Node.js dependencies `npm.cmd ci --prefix backend` से स्थापित करें।
- [ ] `backend/.env.example` को केवल तब `backend/.env` में copy करें जब `.env` पहले से मौजूद न हो; populated `.env` को overwrite न करें।
- [ ] `.env` में केवल approved local test DB की connection details रखें। Production credentials का उपयोग tests में न करें।
- [ ] `.env` Git/source package में commit या साझा न करें।
- [ ] DB host/name/user की पुष्टि के बाद ही DBA-approved schema और guarded `db:init` चलाएँ।
- [ ] Synthetic local test admin बनाना हो तो README के “First administrator for an isolated local test database” निर्देश उपयोग करें। यह script production के लिए नहीं है।
- [ ] `npm.cmd --prefix backend test` चलाएँ; फिर `npm.cmd --prefix backend start` से local app चलाएँ।

## 5. वर्तमान में code में उपलब्ध features

- [ ] Homepage/navigation, college event details/settings और responsive navigation।
- [ ] Public published-events list; staff के लिए draft list और event create/edit/delete/publish controls।
- [ ] Student registration/login, student profile/dashboard और public directory; directory response सीमित fields चुनता है।
- [ ] Staff login और role-based routes; staff account list/create controls।
- [ ] Annual gallery albums, year filter, multiple photos, captions और photo/album delete controls।
- [ ] Invalid event/album dates और photo payload validations; password hashing, JWT verification/expiry तथा login/registration rate limits।

Feature code मौजूद होना end-to-end PostgreSQL compatibility या production policy approval का प्रमाण नहीं है। खास तौर पर event ownership, account lifecycle और public directory approval college policy से तय होने बाकी हैं।

## 6. Release से पहले आवश्यक tests

- [ ] Approved isolated database पर schema compatibility और actual PostgreSQL CRUD tests।
- [ ] Synthetic student registration, duplicate handling, login/logout और refresh के बाद profile persistence।
- [ ] Student/teacher/principal/admin role restrictions और private student-data access checks।
- [ ] Published event public visibility, draft privacy और staff publish/unpublish/edit/delete।
- [ ] Album create/year filtering, multi-photo upload, caption update, deletion और refresh persistence।
- [ ] Browser console/network errors, loading/error/empty states और mobile/tablet/desktop navigation।
- [ ] Backup से अलग, नए isolated database में restore करके records/photos पढ़ने की पुष्टि।

अब तक के local automated suite में route-level database mocks हैं; ये PostgreSQL persistence सिद्ध नहीं करते। इस handover checklist के समय दर्ज अंतिम automated परिणाम: 60 backend tests पास, JavaScript syntax checks 31 files पास, `git diff --check` पास और production dependency audit में 0 high-threshold vulnerabilities। इन्हें database या browser E2E परिणाम न समझें।

## 7. College IT/DBA द्वारा चलाने योग्य service के लिए

- [ ] College IT operating system, service owner, firewall, TLS/HTTPS reverse proxy और restart/rollback procedure तय करे।
- [ ] DBA approved schema/migrations और production first-admin provisioning प्रक्रिया दे। Local test setup scripts production के लिए नहीं हैं।
- [ ] `README.md` के production variables को college secret manager में रखें; secrets source code, email, shell history, Docker image या logs में न डालें।
- [ ] PostgreSQL को private network पर रखें; verified TLS, least-privilege application role और access review लागू करें।
- [ ] Base64 photos के कारण database/backup आकार बढ़ने का ध्यान रखें; durable image storage और retention policy तय करें।
- [ ] Encrypted backups, retention/alerts, restore owner और अलग isolated restore drill की जिम्मेदारी लें।
- [ ] कॉलेज approval के बाद ही site को public करने या production data enable करने का निर्णय लें।

## शेष बाधाएँ

1. `users`/`students` की authoritative schema और DBA approval अभी आवश्यक है।
2. Approved isolated test database मिलने तक real PostgreSQL integration tests नहीं चल सकते।
3. Live server उपलब्ध हुए बिना वास्तविक login, gallery persistence और browser workflows प्रमाणित नहीं हैं।
4. Branding, directory privacy, event authorization, photo consent/retention और first-admin policy पर college के लिखित निर्णय आवश्यक हैं।
