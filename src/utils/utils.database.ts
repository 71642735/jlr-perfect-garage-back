import { Connection } from 'mysql2/promise';

class Database {
	async beginTransaction(connection: Connection) {
		await connection.beginTransaction();
	}

	async commit(connection: Connection) {
		await connection.commit();
	}

	async rollback(connection: Connection) {
		await connection.rollback();
	}
}
export { Database };
