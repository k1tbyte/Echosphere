using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;

[ApiController]
public abstract class BaseCrudController<T>(ICrudRepository<T> repository)
{
#if DEBUG
    [RequireRole(EUserRole.Admin)]
#endif
    [HttpPost]
    public virtual T Add([FromBody] T entity)
    {
        return repository.Add(entity);
    }

    [HttpGet]
    public virtual T? Get(int id)
    {
        return repository.Get(id);
    }

#if !DEBUG
    [RequireRole(UserAccessRights.Admin)]
#endif
    [HttpPatch]
    public virtual void Update([FromBody] T entity)
    {
        repository.Update(entity,true);
    }

#if !DEBUG
    [RequireRole(UserAccessRights.Admin)]
#endif
    [HttpDelete]
    public virtual void Delete(int id)
    {
        repository.DeleteById(id,true);
    }
}