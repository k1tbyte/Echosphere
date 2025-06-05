using Backend.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Backend.Services.Filters;

[AttributeUsage(AttributeTargets.Class|AttributeTargets.Method)]
public sealed class RequireRole(EUserRole rights) : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }
        var claim = user.Claims.FirstOrDefault(o => o.Type == "access_role")?.Value;
        
        if (claim == null || !Enum.TryParse(claim, out EUserRole userRights) || userRights < rights)
        {
            context.Result = new ForbidResult();
        }
    }
}