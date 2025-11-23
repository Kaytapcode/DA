using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.Contracts.Requests
{
    // Sử dụng record để định nghĩa DTO gọn nhẹ trong C#
    public record RegisterRequestDto(
        string Username,
        string Password,
        string Email
    /*
     * Tùy chọn: Thêm các trường khác (FirstName, LastName, v.v.)
     * dựa trên yêu cầu đầy đủ của bạn.
     */
    );
}
