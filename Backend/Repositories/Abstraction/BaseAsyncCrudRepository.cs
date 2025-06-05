using Backend.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories.Abstraction;

public class BaseAsyncCrudRepository<T, TDerived>(DbContext context, DbSet<T> set) : IAsyncCrudRepository<T, TDerived> 
    where T : class
    where TDerived : IAsyncCrudRepository<T, TDerived>
{
    int AutoSaveRequests { get; set; }
    public DbSet<T> Set => set;
    public TDerived WithAutoSave(int nextRequestsCount = 1)
    {
        AutoSaveRequests = nextRequestsCount;
        return (TDerived)(object)this;
    }

    public async Task<T> Add(T entity)
    {
        var entry = await Set.AddAsync(entity);
        await _saveInternalAsync();
        return entry.Entity;
    }

    public async Task<T?> Get(int id)
    {
        return await Set.FindAsync(id);
    }

    public async Task<T> Update(T entity)
    {
        var entry = Set.Update(entity);
        await _saveInternalAsync();
        return entry.Entity;
    }

    public async Task<bool> DeleteById(object id)
    {
        var entity = await Set.FindAsync(id);
        return await Delete(entity);
    }

    public async Task<bool> Delete(T? entity)
    {
        if (entity == null)
            return false;

        Set.Remove(entity);
        await _saveInternalAsync();
        return true;
    }
    public async Task<TDerived> SaveAsync()
    {
        await context.SaveChangesAsync().ConfigureAwait(false);
        return (TDerived)(object)this;
    }
    
    public async Task<IEnumerable<T>> GetAllAsync(
        Func<IQueryable<T>, IQueryable<T>>? filter = null,
        string? sortBy = null,
        bool sortDescending = false,
        int offset = 0,
        int limit = 100)
    {
        IQueryable<T> query = Set;

        if (filter != null)
        {
            query = filter(query);
        }

        if (!string.IsNullOrEmpty(sortBy))
        {
            query = sortDescending
                ? query.OrderByDescendingDynamic(sortBy)
                : query.OrderByDynamic(sortBy);
        }

        query = query.Skip(offset).Take(limit);

        return await query.ToListAsync();
    }
    
    

    private async Task _saveInternalAsync()
    {
        if (AutoSaveRequests == -1)
        {
            await SaveAsync();
            return;
        }
        if (AutoSaveRequests > 0)
        {
            AutoSaveRequests--;
            await SaveAsync();
        }
    }
}