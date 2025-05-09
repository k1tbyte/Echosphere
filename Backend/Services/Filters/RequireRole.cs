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
        
        // TODO: Check if the user has the required access rights
        /*var claim = user.Claims.FirstOrDefault(o => o.Type == JwtService.AccessRightsClaimName)?.Value;
        
        if (claim == null || byte.Parse(claim) < (byte)rights)
        {
            context.Result = new ForbidResult();
        }*/
    }
}