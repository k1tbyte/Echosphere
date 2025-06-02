using System.Linq.Expressions;
using System.Reflection;

namespace Backend.Infrastructure;

public static class QueryableExtensions
{
    public static IQueryable<T> OrderByDynamic<T>(this IQueryable<T> source, string propertyName)
    {
        return ApplyOrder<T>(source, propertyName, "OrderBy");
    }

    public static IQueryable<T> OrderByDescendingDynamic<T>(this IQueryable<T> source, string propertyName)
    {
        return ApplyOrder<T>(source, propertyName, "OrderByDescending");
    }

    private static IQueryable<T> ApplyOrder<T>(IQueryable<T> source, string propertyName, string methodName)
    {
        var entityType = typeof(T);
        var property = entityType.GetProperty(propertyName,
            BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

        if (property == null)
            throw new ArgumentException($"Property '{propertyName}' not found on type '{entityType.Name}'.");

        var parameter = Expression.Parameter(entityType, "x");
        var propertyAccess = Expression.MakeMemberAccess(parameter, property);
        var orderByExp = Expression.Lambda(propertyAccess, parameter);

        var resultExp = Expression.Call(
            typeof(Queryable),
            methodName,
            [entityType, property.PropertyType],
            source.Expression,
            Expression.Quote(orderByExp));

        return source.Provider.CreateQuery<T>(resultExp);
    }
}