using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Shared.Contracts.Responses
{
    public record AuthResponseDto(
        string Token,
        string Message // Có thể trả về thông báo hoặc trạng thái
    );

}
