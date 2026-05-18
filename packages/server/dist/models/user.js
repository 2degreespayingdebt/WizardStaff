import { query } from '../config/db.js';
export async function createUser(username, email, passwordHash, displayName) {
    const result = await query(`INSERT INTO users (username, email, password_hash, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`, [username, email, passwordHash, displayName || username]);
    return result.rows[0];
}
export async function findUserByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? result.rows[0] : null;
}
export async function findUserById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? result.rows[0] : null;
}
export async function findUserByUsername(username) {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] ? result.rows[0] : null;
}
export async function updateUser(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    if (updates.displayName !== undefined) {
        fields.push(`display_name = $${paramCount++}`);
        values.push(updates.displayName);
    }
    if (updates.avatarUrl !== undefined) {
        fields.push(`avatar_url = $${paramCount++}`);
        values.push(updates.avatarUrl);
    }
    if (fields.length === 0)
        return findUserById(id);
    values.push(id);
    const result = await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
    return result.rows[0] ? result.rows[0] : null;
}
//# sourceMappingURL=user.js.map