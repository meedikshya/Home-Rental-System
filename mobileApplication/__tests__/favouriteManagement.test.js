const mockApiHandler = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
};
const FavoritesManager = {
  favorites: [],
  selectedFavorites: [],
  // Core functionality
  fetchUserFavorites: async function (userId) {
    try {
      const response = await mockApiHandler.get(`/Favourites/user/${userId}`);
      this.favorites = response.map((favorite) => favorite.propertyId);
      return this.favorites;
    } catch (error) {
      return [];
    }
  },
  addToFavorites: async function (userId, propertyId) {
    await mockApiHandler.post("/Favourites", { userId, propertyId });
    this.favorites.push(propertyId);
    return true;
  },
  removeFromFavorites: async function (userId, propertyId) {
    await mockApiHandler.delete(
      `/Favourites/remove?userId=${userId}&propertyId=${propertyId}`
    );
    this.favorites = this.favorites.filter((id) => id !== propertyId);
    return true;
  },
  toggleSelection: function (favoriteId) {
    if (this.selectedFavorites.includes(favoriteId)) {
      this.selectedFavorites = this.selectedFavorites.filter(
        (id) => id !== favoriteId
      );
    } else {
      this.selectedFavorites.push(favoriteId);
    }
    return this.selectedFavorites;
  },
  bulkRemoveFavorites: async function (favoriteIds) {
    await Promise.all(
      favoriteIds.map((id) => mockApiHandler.delete(`/Favourites/${id}`))
    );
    this.favorites = this.favorites.filter((id) => !favoriteIds.includes(id));
    this.selectedFavorites = [];
    return true;
  },
};
describe("Favorites List Management", () => {
  // Test data
  const userId = "user123";
  const mockFavoritesList = [
    { favouriteId: 101, userId: "user123", propertyId: 1 },
    { favouriteId: 102, userId: "user123", propertyId: 3 },
  ];
  beforeEach(() => {
    jest.clearAllMocks();
    FavoritesManager.favorites = [];
    FavoritesManager.selectedFavorites = [];
    // Default mock responses
    mockApiHandler.get.mockResolvedValue(mockFavoritesList);
    mockApiHandler.post.mockResolvedValue({ favouriteId: 999 });
    mockApiHandler.delete.mockResolvedValue({ success: true });
  });
  test("Should fetch user favorites correctly", async () => {
    const favorites = await FavoritesManager.fetchUserFavorites(userId);
    expect(mockApiHandler.get).toHaveBeenCalledWith(
      `/Favourites/user/${userId}`
    );
    expect(favorites).toEqual([1, 3]);
  });
  test("Should add property to favorites", async () => {
    await FavoritesManager.addToFavorites(userId, 2);
    expect(mockApiHandler.post).toHaveBeenCalledWith("/Favourites", {
      userId,
      propertyId: 2,
    });
    expect(FavoritesManager.favorites).toContain(2);
  });
  test("Should remove property from favorites", async () => {
    // Setup initial favorites
    FavoritesManager.favorites = [1, 3];
    await FavoritesManager.removeFromFavorites(userId, 1);
    expect(mockApiHandler.delete).toHaveBeenCalledWith(
      `/Favourites/remove?userId=${userId}&propertyId=1`
    );
    expect(FavoritesManager.favorites).toEqual([3]);
  });
  test("Should handle selection of multiple favorites", () => {
    FavoritesManager.toggleSelection(101);
    expect(FavoritesManager.selectedFavorites).toEqual([101]);
    FavoritesManager.toggleSelection(102);
    expect(FavoritesManager.selectedFavorites).toEqual([101, 102]);
    FavoritesManager.toggleSelection(101);
    expect(FavoritesManager.selectedFavorites).toEqual([102]);
  });
  test("Should remove multiple favorites at once", async () => {
    FavoritesManager.favorites = [1, 2, 3];
    FavoritesManager.selectedFavorites = [101, 102];
    await FavoritesManager.bulkRemoveFavorites([101, 102]);
    expect(mockApiHandler.delete).toHaveBeenCalledTimes(2);
    expect(mockApiHandler.delete).toHaveBeenCalledWith("/Favourites/101");
    expect(mockApiHandler.delete).toHaveBeenCalledWith("/Favourites/102");
    expect(FavoritesManager.selectedFavorites).toEqual([]);
  });
});
