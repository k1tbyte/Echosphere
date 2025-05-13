using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class friendship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Friendships_user_adressee_id",
                table: "Friendships");

            migrationBuilder.DropForeignKey(
                name: "FK_Friendships_user_requester_id",
                table: "Friendships");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Friendships",
                table: "Friendships");

            migrationBuilder.RenameTable(
                name: "Friendships",
                newName: "friendship");

            migrationBuilder.RenameIndex(
                name: "IX_Friendships_adressee_id",
                table: "friendship",
                newName: "IX_friendship_adressee_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_friendship",
                table: "friendship",
                columns: new[] { "requester_id", "adressee_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_friendship_user_adressee_id",
                table: "friendship",
                column: "adressee_id",
                principalTable: "user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_friendship_user_requester_id",
                table: "friendship",
                column: "requester_id",
                principalTable: "user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_friendship_user_adressee_id",
                table: "friendship");

            migrationBuilder.DropForeignKey(
                name: "FK_friendship_user_requester_id",
                table: "friendship");

            migrationBuilder.DropPrimaryKey(
                name: "PK_friendship",
                table: "friendship");

            migrationBuilder.RenameTable(
                name: "friendship",
                newName: "Friendships");

            migrationBuilder.RenameIndex(
                name: "IX_friendship_adressee_id",
                table: "Friendships",
                newName: "IX_Friendships_adressee_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Friendships",
                table: "Friendships",
                columns: new[] { "requester_id", "adressee_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_Friendships_user_adressee_id",
                table: "Friendships",
                column: "adressee_id",
                principalTable: "user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Friendships_user_requester_id",
                table: "Friendships",
                column: "requester_id",
                principalTable: "user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
