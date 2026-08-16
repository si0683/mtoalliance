<?php
/**
 * Обработчик формы заявки — сайт «МТО-Альянс»
 * -------------------------------------------------------------------
 * ВАЖНО: этот файл работает ТОЛЬКО на хостинге с поддержкой PHP.
 *        На GitHub Pages (статический хостинг) PHP НЕ выполняется.
 *
 * Куда приходят заявки — адрес ниже ($TO).
 * Сейчас указан ВРЕМЕННЫЙ адрес для проверки. После успешного теста
 * замените его на корпоративный:  info@mto-smr.ru
 * -------------------------------------------------------------------
 */

$TO      = 'vasiliysidorenko63@yandex.ru';          // куда приходят заявки. TODO: заменить на info@mto-smr.ru
$SUBJECT = 'Заявка с сайта МТО-Альянс';

// ── Настройки SMTP-отправки ───────────────────────────────────────
//  Пример ниже — для Яндекс.Почты. Для другого провайдера поменяйте host/port.
//  ВАЖНО: $SMTP_USER должен совпадать с $FROM (провайдер не даёт слать
//  «от чужого имени»). Пароль — это «пароль приложения», а НЕ пароль от
//  почты (создаётся в настройках безопасности ящика).
$SMTP_HOST   = 'smtp.yandex.ru';
$SMTP_PORT   = 465;                                  // 465 = SSL, 587 = TLS
$SMTP_SECURE = 'ssl';                                // 'ssl' для 465, 'tls' для 587
$SMTP_USER   = 'vasiliysidorenko63@yandex.ru';       // логин ящика-отправителя
$SMTP_PASS   = 'ВСТАВЬТЕ_ПАРОЛЬ_ПРИЛОЖЕНИЯ';         // TODO: пароль приложения
$FROM        = $SMTP_USER;                           // адрес отправителя (= логину SMTP)
$FROM_NAME   = 'Сайт МТО-Альянс';
// ──────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
    exit;
}

// Данные приходят как JSON (fetch) либо как обычный POST
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) { $data = $_POST; }

function field($d, $k) { return isset($d[$k]) ? trim((string)$d[$k]) : ''; }

function fail($msg, $code = 422) {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// Антиспам: honeypot заполнен => это бот. Тихо отвечаем «успех», письмо не шлём.
if (field($data, '_honey') !== '') { echo json_encode(['success' => true]); exit; }

$name    = field($data, 'name');
$inn     = preg_replace('/\D/', '', field($data, 'inn'));
$phone   = preg_replace('/\D/', '', field($data, 'phone'));
if (strlen($phone) === 11 && $phone[0] === '8') { $phone = '7' . substr($phone, 1); }
$email   = field($data, 'email');
$message = field($data, 'message');

// Проверка ИНН (10 или 12 цифр) по контрольным разрядам
function valid_inn($v) {
    $len = strlen($v);
    if ($len !== 10 && $len !== 12) return false;
    $d = array_map('intval', str_split($v));
    $ctrl = function ($nums, $k) {
        $s = 0; foreach ($k as $i => $c) { $s += $c * $nums[$i]; } return ($s % 11) % 10;
    };
    if ($len === 10) return $ctrl($d, [2,4,10,3,5,9,4,6,8]) === $d[9];
    $n11 = $ctrl($d, [7,2,4,10,3,5,9,4,6,8]);
    $n12 = $ctrl($d, [3,7,2,4,10,3,5,9,4,6,8]);
    return $n11 === $d[10] && $n12 === $d[11];
}

$errors = [];
if (mb_strlen($name) < 2)                       $errors[] = 'имя';
if (!valid_inn($inn))                           $errors[] = 'ИНН';
if (!preg_match('/^7\d{10}$/', $phone))         $errors[] = 'телефон';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'e-mail';

if ($errors) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Проверьте поля: ' . implode(', ', $errors)], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Вложения (до 10 файлов, суммарно до 100 МБ): проверка типа/размера + защита ──
$MAX_FILES = 10;
$MAX_TOTAL = 100 * 1024 * 1024; // 100 МБ

// Белый список расширений
$allowedExt = ['pdf','doc','docx','xls','xlsx','ppt','pptx','odp','odt','ods','rtf','txt','csv','jpg','jpeg','png','tif','tiff','bmp','zip','rar','7z'];
// Допустимые реальные MIME-типы (по содержимому). Блокирует переименованные exe/скрипты.
$safeMime = [
    'application/pdf',
    'application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text','application/vnd.oasis.opendocument.spreadsheet','application/vnd.oasis.opendocument.presentation',
    'application/rtf','text/rtf','text/plain','text/csv','application/csv',
    'image/jpeg','image/png','image/tiff','image/bmp','image/x-ms-bmp',
    'application/zip','application/x-rar','application/vnd.rar','application/x-rar-compressed','application/x-7z-compressed',
    'application/octet-stream',
];

$attachments = []; // ['data' => ..., 'name' => ...]
if (isset($_FILES['attachment'])) {
    $F     = $_FILES['attachment'];
    $names = (array)$F['name'];
    $tmps  = (array)$F['tmp_name'];
    $sizes = (array)$F['size'];
    $errs  = (array)$F['error'];

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $total = 0;
    // $clam = '/usr/bin/clamscan'; // антивирус (опционально)

    foreach ($names as $i => $origName) {
        $err = isset($errs[$i]) ? $errs[$i] : UPLOAD_ERR_NO_FILE;
        if ($err === UPLOAD_ERR_NO_FILE) continue;
        if ($err !== UPLOAD_ERR_OK)             fail('Ошибка загрузки файла: ' . $origName);
        if (count($attachments) >= $MAX_FILES)  fail('Можно прикрепить не более ' . $MAX_FILES . ' файлов');
        if (!is_uploaded_file($tmps[$i]))       fail('Ошибка загрузки файла');

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true)) fail('Недопустимый тип файла: ' . $origName);

        $mime = finfo_file($finfo, $tmps[$i]);
        if (!in_array($mime, $safeMime, true))  fail('Содержимое файла не разрешено: ' . $origName);

        $total += $sizes[$i];
        if ($total > $MAX_TOTAL)                fail('Суммарный размер файлов больше 100 МБ');

        // if (isset($clam) && is_executable($clam)) {
        //     exec(escapeshellarg($clam) . ' --no-summary ' . escapeshellarg($tmps[$i]), $o, $rc);
        //     if ($rc !== 0) fail('Файл не прошёл антивирусную проверку: ' . $origName);
        // }

        $safeName = preg_replace('/[^\w.\- ]+/u', '_', $origName);
        $attachments[] = ['data' => file_get_contents($tmps[$i]), 'name' => $safeName];
    }
    finfo_close($finfo);
}
$attachNames = array_map(function ($a) { return $a['name']; }, $attachments);

$body  = "Новая заявка с сайта МТО-Альянс\n\n";
$body .= "Имя:      $name\n";
$body .= "ИНН:      $inn\n";
$body .= "Телефон:  +$phone\n";
$body .= "E-mail:   $email\n";
$body .= "Вложения: " . (count($attachNames) ? count($attachNames) . ' — ' . implode(', ', $attachNames) : 'нет') . "\n";
$body .= "\n-- \nОтправлено с сайта, " . date('d.m.Y H:i');

// ── Отправка через SMTP (PHPMailer) ──
require __DIR__ . '/libs/PHPMailer/Exception.php';
require __DIR__ . '/libs/PHPMailer/PHPMailer.php';
require __DIR__ . '/libs/PHPMailer/SMTP.php';

$mail = new \PHPMailer\PHPMailer\PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = $SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = $SMTP_USER;
    $mail->Password   = $SMTP_PASS;
    $mail->SMTPSecure = $SMTP_SECURE;   // 'ssl' | 'tls'
    $mail->Port       = $SMTP_PORT;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom($FROM, $FROM_NAME);
    $mail->addAddress($TO);
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $mail->addReplyTo($email); // ответить сразу клиенту
    }
    $mail->Subject = $SUBJECT;
    $mail->Body    = $body;

    foreach ($attachments as $a) {
        $mail->addStringAttachment($a['data'], $a['name']);
    }

    $mail->send();
    echo json_encode(['success' => true]);
} catch (\PHPMailer\PHPMailer\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Не удалось отправить письмо (SMTP). ' . $mail->ErrorInfo], JSON_UNESCAPED_UNICODE);
}
