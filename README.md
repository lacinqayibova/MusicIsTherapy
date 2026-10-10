# 🎵 MusicIsTherapy

**MusicIsTherapy** — istifadəçilərə musiqiləri kəşf etmək, dinləmək və öz musiqi kolleksiyalarını idarə etmək imkanı verən veb tətbiqidir. Layihə musiqi vasitəsilə rahatlıq və xoş dinləmə təcrübəsi yaratmağa yönəlib.

## 📌 Layihənin məqsədi

Layihənin əsas məqsədi istifadəçilərin sevdikləri musiqilərə rahat şəkildə daxil ola biləcəyi, mahnılarını kateqoriyalara görə axtara biləcəyi və şəxsi musiqi seçimlərini idarə edə biləcəyi sadə və istifadəsi rahat platforma yaratmaqdır.

## ✨ Əsas funksiyalar

- **İstifadəçi girişi:** İstifadəçi adı və şifrə ilə sistemə daxil olmaq.
- **Musiqi pleyeri:** Mahnıları səsləndirmək, dayandırmaq, əvvəlki və növbəti mahnıya keçmək.
- **Musiqi axtarışı:** Mahnıları, ifaçıları və janrları axtarmaq.
- **Janr filtri:** Musiqiləri janrlarına görə süzmək.
- **Sevimlilər:** Bəyənilən mahnıları ayrıca siyahıda saxlamaq.
- **Dinləmə tarixçəsi:** Son dinlənilən mahnıları izləmək.
- **Pleylistlər:** Şəxsi pleylistlər yaratmaq və idarə etmək.
- **İnterfeys mövzuları:** Mövcud rəng mövzuları arasında seçim etmək.

## 🛠️ İstifadə olunan texnologiyalar

| Texnologiya | Nə üçün istifadə olunur? |
|---|---|
| HTML5 | Veb səhifələrin strukturunu yaratmaq üçün |
| CSS3 | Dizaynı, rəngləri, səhifə düzülüşünü və görünüşü tənzimləmək üçün |
| JavaScript | İstifadəçi interaksiyalarını, axtarışı və musiqi pleyerinin məntiqini idarə etmək üçün |
| Node.js | Server tərəfini qurmaq və sorğuları emal etmək üçün |
| Node.js HTTP API | Brauzerlə server arasında HTTP sorğularını idarə etmək üçün |
| JSON | Musiqi kataloqunu, istifadəçi məlumatlarını və tətbiq vəziyyətini fayllarda saxlamaq üçün |
| Fetch API | Frontend ilə backend arasında məlumat mübadiləsi aparmaq üçün |
| LocalStorage | Giriş tokenini və interfeys mövzusu seçimini brauzerdə saxlamaq üçün |
| Git və GitHub | Kodun versiyalarını izləmək və layihəni saxlamaq üçün |

## ⚙️ Layihənin iş prinsipi

1. İstifadəçi giriş səhifəsindən sistemə daxil olur.
2. Frontend Node.js serverinə sorğu göndərir.
3. Server istifadəçi məlumatlarını yoxlayır və giriş uğurlu olduqda sessiya tokeni yaradır.
4. Tətbiq musiqi kataloqunu və istifadəçinin saxlanmış seçimlərini serverdən əldə edir.
5. İstifadəçi mahnıları dinləyə, axtara, sevimlilərə əlavə edə və pleylistlərini idarə edə bilir.
6. İstifadəçi seçimləri JSON fayllarında saxlanılır.

## 💻 Quraşdırılma və işə salınma

### Tələblər

- [Node.js](https://nodejs.org/) — 20 və ya daha yeni versiya
- [Git](https://git-scm.com/)
- Visual Studio Code və ya başqa kod redaktoru

### 1. Repository-ni klonla

```bash
git clone https://github.com/lacinqayibova/MusicIsTherapy.git
```

### 2. Layihə qovluğuna keç

```bash
cd MusicIsTherapy
```

### 3. Serveri işə sal

```bash
npm start
```

### 4. Brauzerdə aç

```text
http://127.0.0.1:3000
```

Qeyd: Layihə standart olaraq `3000` portundan istifadə edir. Əgər port artıq istifadə olunursa, onu boşaltmaq və ya serverin port parametrini dəyişmək lazımdır.

## 📁 Layihənin strukturu

```text
MusicIsTherapy/
├── backend/
│   └── data/
│       ├── catalog.json
│       ├── users.json
│       └── user-state.json
├── index.html
├── login.html
├── login.js
├── script.js
├── server.js
├── styles.css
├── musicistherapylogin.png
├── package.json
└── README.md
```

- `index.html` — əsas tətbiq səhifəsi.
- `login.html` — istifadəçi giriş səhifəsi.
- `login.js` — giriş səhifəsinin JavaScript məntiqi.
- `script.js` — musiqi pleyeri və interfeys funksiyaları.
- `styles.css` — tətbiqin vizual dizaynı.
- `server.js` — Node.js serveri və API endpoint-ləri.
- `catalog.json` — musiqi kataloqu və əlaqəli məlumatlar.
- `users.json` — demo istifadəçi məlumatları.
- `user-state.json` — istifadəçinin sevimliləri, dinləmə tarixçəsi və pleylistləri.
- `package.json` — layihənin konfiqurasiyası və işə salınma əmrləri.

## 🎯 Layihənin əhəmiyyəti

MusicIsTherapy layihəsi frontend və backend texnologiyalarını birləşdirərək interaktiv musiqi platformasının yaradılmasını nümayiş etdirir. Layihə istifadəçi interfeysinin hazırlanması, API-lərlə işləmək, məlumatların saxlanılması və server məntiqinin qurulması kimi proqramlaşdırma bacarıqlarını tətbiq etmək məqsədi daşıyır.

## 🔒 Təhlükəsizlik qeydi

Bu layihə tədris və nümayiş məqsədli prototipdir. İstehsalat mühitində istifadə edilməzdən əvvəl parolların təhlükəsiz hash edilməsi, sessiyaların davamlı və təhlükəsiz idarə olunması, həmçinin istifadəçi məlumatlarının qorunması təmin edilməlidir.

## 👩‍💻 Müəllif

**Lachin**

GitHub: [@lacinqayibova](https://github.com/lacinqayibova)

---

*MusicIsTherapy — musiqini kəşf et, dinlə və şəxsi kolleksiyanı yarat.*