using System.ComponentModel.DataAnnotations.Schema;

namespace Auth.Api.Models
{
    public class UserModel
    {
        public long Id { get; set; }
        required public string Username { get; set; }
        required public string Email { get; set; }
        [Column("password_hash")] required public string PasswordHash { get; set; }
        required public string Role { get; set; } = "User";
    }

}
