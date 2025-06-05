export interface IQueryParams {
    offset: number;
    limit: number;
    filter?: string;
    descending?: boolean;
    orderBy?: string;
}

export const queryToSearchParams = (query: IQueryParams): URLSearchParams => {
    const params = new URLSearchParams({
        offset: query.offset.toString(),
        limit: query.limit.toString()
    });

    if (query.filter) {
        params.append('filter', query.filter);
    }
    if (query.descending !== undefined) {
        params.append('desc', query.descending.toString());
    }
    if (query.orderBy) {
        params.append('sortBy', query.orderBy);
    }
    return params;
}