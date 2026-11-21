import pg from "pg";

const { Client } = pg;

async function testarConexao() {
  const client = new Client({
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "unigest",
    ssl: false,
  });

  try {
    await client.connect();

    const resultado = await client.query(`
      SELECT
        current_database(),
        current_user,
        inet_server_addr(),
        inet_server_port()
    `);

    console.log("Conexão estabelecida!");
    console.log(resultado.rows);
  } catch (error) {
    console.error("Falha na conexão:");
    console.error(error);
  } finally {
    await client.end().catch(() => {});
  }
}

testarConexao();