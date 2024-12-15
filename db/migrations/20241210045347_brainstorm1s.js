/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex)
{
    return knex.schema.createTableIfNotExists("brainstorm1s", (table) =>
    {
        table.increments("id").primary();
        table.integer("user_id").unsigned().notNullable();
        table.string("pageids").notNullable();
        table.text("note").nullable();
        table.text("extractedTexts").nullable();
        table.text("transformedText").nullable();
        table.timestamps();


        table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex)
{
    return knex.schema.dropTableIfExists("brainstorm1s");
};