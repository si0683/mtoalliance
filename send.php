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

$TO      = 'vasiliysidorenko63@yandex.ru';          // TODO: заменить на info@mto-smr.ru
$SUBJECT = 'Заявка с сайта МТО-Альянс';
$FROM    = 'noreply@mto-smr.ru';                     // лучше — реальный ящик вашего домена

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

$subject_enc = '=?UTF-8?B?' . base64_encode($SUBJECT) . '?=';
$fromHdr = 'From: =?UTF-8?B?' . base64_encode('МТО-Альянс') . "?= <$FROM>";

if ($attachData !== null) {
    // Письмо с вложением (multipart/mixed)
    $boundary = 'b_' . md5(uniqid('', true));
    $headers  = $fromHdr . "\r\n";
    $headers .= 'Reply-To: ' . $email . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

    $msg  = '--' . $boundary . "\r\n";
    $msg .= "Content-Type: text/plain; charset=utf-8\r\n";
    $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $msg .= $body . "\r\n\r\n";
    $msg .= '--' . $boundary . "\r\n";
    $msg .= 'Content-Type: application/octet-stream; name="' . $attachName . '"' . "\r\n";
    $msg .= "Content-Transfer-Encoding: base64\r\n";
    $msg .= 'Content-Disposition: attachment; filename="' . $attachName . '"' . "\r\n\r\n";
    $msg .= chunk_split(base64_encode($attachData)) . "\r\n";
    $msg .= '--' . $boundary . '--';

    $ok = @mail($TO, $subject_enc, $msg, $headers);
} else {
    // Обычное текстовое письмо
    $headers  = $fromHdr . "\r\n";
    $headers .= 'Reply-To: ' . $email . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=utf-8";
    $ok = @mail($TO, $subject_enc, $body, $headers);
}

if ($ok) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Не удалось отправить письмо на сервере']);
}
