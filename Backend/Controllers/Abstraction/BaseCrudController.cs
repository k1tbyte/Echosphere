﻿using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;

[ApiController]
     [Route(Constants.DefaultRoutePattern)]
     public abstract class BaseCrudController<T, TDerived>(IAsyncCrudRepository<T, TDerived> repository) : 
         ControllerBase where T : class
         where TDerived : IAsyncCrudRepository<T, TDerived>
     {
     #if !DEBUG
         [RequireRole(EUserRole.Admin)]
     #endif
     [HttpPost]
     public virtual async Task<ActionResult<T>> Add([FromBody] T entity)
     {
         var result = await repository.Add(entity);
         return Ok(result);
     }
 
     [HttpGet("{id}")]
     public virtual async Task<ActionResult<T?>> Get(int id)
     {
         var result = await repository.Get(id);
         if (result == null)
             return NotFound();
 
         return Ok(result);
     }

    #if !DEBUG
        [RequireRole(EUserRole.Admin)]
    #endif
    [HttpPatch]
    public virtual async Task<IActionResult> Update([FromBody] T entity)
    {
        await repository.Update(entity);
        return NoContent();
    }

    #if !DEBUG
        [RequireRole(EUserRole.Admin)]
    #endif
    [HttpDelete("{id}")]
    public virtual async Task<IActionResult> Delete(int id)
    {
        var success = await repository.DeleteById(id);
        if (!success)
            return NotFound();

        return NoContent();
    }
}