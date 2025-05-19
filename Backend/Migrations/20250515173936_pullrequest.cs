using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class pullrequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_friendship_user_adressee_id",
                table: "friendship");

            migrationBuilder.RenameColumn(
                name: "adressee_id",
                table: "friendship",
                newName: "addressee_id");

            migrationBuilder.RenameIndex(
                name: "IX_friendship_adressee_id",
                table: "friendship",
                newName: "IX_friendship_addressee_id");

            migrationBuilder.AddForeignKey(
                name: "FK_friendship_user_addressee_id",
                table: "friendship",
                column: "addressee_id",
                principalTable: "user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_friendship_user_addressee_id",
                table: "friendship");

            migrationBuilder.RenameColumn(
                name: "addressee_id",
                table: "friendship",
                newName: "adressee_id");

            migrationBuilder.RenameIndex(
                name: "IX_friendship_addressee_id",
                table: "friendship",
                newName: "IX_friendship_adressee_id");

            migrationBuilder.AddForeignKey(
                name: "FK_friendship_user_adressee_id",
                table: "friendship",
                column: "adressee_id",
                principalTable: "user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
