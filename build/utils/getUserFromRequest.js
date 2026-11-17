export function getUserFromRequest(request) {
    const user = request.user;
    if (!user) {
        throw new Error("You need to be authenticated to use this resource");
    }
    return user;
}
