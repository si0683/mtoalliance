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

// ── Вложение (необязательно): проверка типа/размера + защита ──
$attachData = null; $attachName = '';
if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
    $f = $_FILES['attachment'];
    $maxSize = 10 * 1024 * 1024; // 10 МБ

    // Белый список: расширение => допустимые реальные MIME-типы
    $allowed = [
        'pdf'  => ['application/pdf'],
        'doc'  => ['application/msword', 'application/octet-stream'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
        'xls'  => ['application/vnd.ms-excel', 'application/octet-stream'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
    ];

    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!isset($allowed[$ext]))       fail('Недопустимый тип файла. Разрешены PDF, Word, Excel');
    if ($f['size'] > $maxSize)        fail('Файл больше 10 МБ');
    if (!is_uploaded_file($f['tmp_name'])) fail('Ошибка загрузки файла');

    // Реальный MIME по содержимому (а не по расширению)
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $f['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mime, $allowed[$ext], true)) fail('Содержимое файла не соответствует расширению');

    // ── Антивирус ClamAV (опционально). Раскомментируйте, если на хостинге есть clamscan ──
    // $clam = '/usr/bin/clamscan';
    // if (is_executable($clam)) {
    //     exec(escapeshellarg($clam) . ' --no-summary ' . escapeshellarg($f['tmp_name']), $o, $rc);
    //     if ($rc !== 0) fail('Файл не прошёл антивирусную проверку');
    // }

    $attachData = file_get_contents($f['tmp_name']);
    $attachName = preg_replace('/[^\w.\- ]+/u', '_', $f['name']); // безопасное имя
}

$body  = "Новая заявка с сайта МТО-Альянс\n\n";
$body .= "Имя:      $name\n";
$body .= "ИНН:      $inn\n";
$body .= "Телефон:  +$phone\n";
$body .= "E-mail:   $email\n";
$body .= "Вложение: " . ($attachName !== '' ? $attachName : 'нет') . "\n";
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

    if ($attachData !== null) {
        $mail->addStringAttachment($attachData, $attachName);
    }

    $mail->send();
    echo json_encode(['success' => true]);
} catch (\PHPMailer\PHPMailer\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Не удалось отправить письмо (SMTP). ' . $mail->ErrorInfo], JSON_UNESCAPED_UNICODE);
}
