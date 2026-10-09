<?php

declare(strict_types=1);

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
    echo 'OK: '.$message.PHP_EOL;
}

function denied(callable $operation, string $message): void
{
    try {
        $operation();
    } catch (PDOException $exception) {
        check($exception->getCode() === '42501', $message);

        return;
    }
    throw new RuntimeException('Se permitio una operacion prohibida: '.$message);
}

$dsn = 'pgsql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_DATABASE');
$options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION];
$app = new PDO($dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'), $options);
$migration = new PDO($dsn, getenv('TEST_MIGRATION_USERNAME'), getenv('TEST_MIGRATION_PASSWORD'), $options);

$role = $app->query('SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user')->fetch(PDO::FETCH_ASSOC);
check($role !== false && ! array_filter($role), 'Rol de aplicacion sin privilegios elevados ni BYPASSRLS');
check($app->query('SELECT current_user')->fetchColumn() !== $migration->query('SELECT current_user')->fetchColumn(), 'Roles distintos para API y migraciones');
$schemaOwner = $migration->query("SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'public'")->fetchColumn();
check($schemaOwner !== getenv('DB_USERNAME'), 'La aplicacion no es duena del esquema');
$membership = $app->prepare("SELECT pg_has_role(current_user, ?, 'MEMBER')");
$membership->execute([getenv('TEST_MIGRATION_USERNAME')]);
check($membership->fetchColumn() === false, 'La aplicacion no puede asumir el rol de migraciones');
denied(fn () => $app->exec('CREATE TABLE public.forbidden_probe (id int)'), 'La aplicacion no puede crear tablas');

// Fixture aislado y efimero: valida los permisos reales, no crea tablas de negocio.
$table = 'infra_rls_'.bin2hex(random_bytes(6));
$companyA = '00000000-0000-4000-8000-000000000001';
$companyB = '00000000-0000-4000-8000-000000000002';
$migration->exec("CREATE TABLE $table (id integer PRIMARY KEY, empresa_id uuid NOT NULL)");
try {
    $migration->exec("INSERT INTO $table VALUES (1, '$companyA'), (2, '$companyB')");
    $migration->exec("ALTER TABLE $table ENABLE ROW LEVEL SECURITY");
    $migration->exec("ALTER TABLE $table FORCE ROW LEVEL SECURITY");
    $migration->exec("CREATE POLICY company_policy ON $table USING (empresa_id = nullif(current_setting('app.current_empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.current_empresa_id', true), '')::uuid)");
    check((int) $app->query("SELECT count(*) FROM $table")->fetchColumn() === 0, 'Sin contexto no se ven filas');
    $app->beginTransaction();
    $app->exec("SET LOCAL app.current_empresa_id = '$companyA'");
    check($app->query("SELECT id FROM $table")->fetchAll(PDO::FETCH_COLUMN) === [1], 'Empresa A solo ve sus filas');
    check($app->exec("UPDATE $table SET id = 20 WHERE id = 2") === 0, 'Empresa A no modifica filas de B');
    check($app->exec("DELETE FROM $table WHERE id = 2") === 0, 'Empresa A no borra filas de B');
    $app->exec("INSERT INTO $table VALUES (3, '$companyA')");
    $app->commit();
    check((int) $app->query("SELECT count(*) FROM $table")->fetchColumn() === 0, 'El contexto LOCAL no se filtra a la siguiente transaccion');
    $app->beginTransaction();
    $app->exec("SET LOCAL app.current_empresa_id = '$companyB'");
    check($app->query("SELECT id FROM $table")->fetchAll(PDO::FETCH_COLUMN) === [2], 'Empresa B solo ve sus filas');
    denied(fn () => $app->exec("INSERT INTO $table VALUES (4, '$companyA')"), 'Empresa B no inserta filas de A');
    $app->rollBack();
    denied(fn () => $app->exec("ALTER TABLE $table DISABLE ROW LEVEL SECURITY"), 'La aplicacion no puede desactivar RLS');
    denied(fn () => $app->exec("TRUNCATE $table"), 'La aplicacion no puede vaciar una tabla saltandose RLS');
} finally {
    if ($app->inTransaction()) {
        $app->rollBack();
    }
    $migration->exec("DROP TABLE $table");
}

foreach (['http://nginx/api/health', 'http://frontend:5173/api/health'] as $url) {
    $body = file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 10]]));
    check($body !== false && json_decode($body, true, flags: JSON_THROW_ON_ERROR) === ['status' => 'ok', 'service' => 'nomix-api'], 'API JSON disponible en '.$url);
}
$redis = new Redis;
$redis->connect(getenv('REDIS_HOST'), (int) getenv('REDIS_PORT'), 5);
check($redis->ping() === true, 'Redis responde');
$smtp = fsockopen('mailpit', 1025, $errorCode, $errorMessage, 5);
check($smtp !== false && str_starts_with(fgets($smtp), '220'), 'Mailpit acepta conexiones SMTP');
fclose($smtp);
echo 'Infraestructura verificada.'.PHP_EOL;
