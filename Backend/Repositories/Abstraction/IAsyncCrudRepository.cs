using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories.Abstraction;

public interface IAsyncCrudRepository<T, TDerived> where T : class
    where TDerived : IAsyncCrudRepository<T, TDerived>
{
    public DbSet<T> Set { get; }
    public TDerived WithAutoSave(int nextRequestsCount = 1);
    public Task<T> Add(T entity);

    public Task<T?> Get(int id);

    public Task<T> Update(T entity);

    public Task<bool> DeleteById(object id);
    public Task<bool> Delete(T entity);
    Task<IEnumerable<T>> GetAllAsync(
        Func<IQueryable<T>, IQueryable<T>>? filter = null,
        string? sortBy = null,
        bool sortDescending = false,
        int page = 1,
        int pageSize = 10
    );
    public Task<TDerived> SaveAsync();
}