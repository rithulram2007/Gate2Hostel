/**
 * Determines whether an order's dropHostel string matches the selected hostel filter.
 * Handles exact matches ("MH-D" === "MH-D"), compound labels ("MH-D Block 402"),
 * and campus zone groups ("group_mh", "group_lh").
 *
 * @param {string} orderHostel - The dropHostel string on the order record
 * @param {string} selectedFilter - The active hostel filter ("all", "group_mh", "group_lh", "MH-D", etc.)
 * @returns {boolean}
 */
export const matchesHostel = (orderHostel, selectedFilter) => {
  if (!selectedFilter || selectedFilter === 'all') return true;
  if (!orderHostel) return false;

  const normalizedOrderHostel = orderHostel.trim().toUpperCase();

  // Zone group filters (e.g. all Men's Hostels or all Ladies' Hostels)
  if (selectedFilter === 'group_mh') {
    return normalizedOrderHostel.startsWith('MH');
  }
  if (selectedFilter === 'group_lh') {
    return normalizedOrderHostel.startsWith('LH');
  }

  // Specific block matching, e.g. "MH-D"
  const filterUpper = selectedFilter.toUpperCase();

  // Exact match
  if (normalizedOrderHostel === filterUpper) return true;

  // Prefix match with non-alphanumeric boundary (e.g. "MH-D Block 402", "MH-D-102", "MH-D, Room 5")
  const regex = new RegExp(`^${filterUpper}(\\b|\\s|[-_,])`, 'i');
  return regex.test(normalizedOrderHostel);
};

export default matchesHostel;
