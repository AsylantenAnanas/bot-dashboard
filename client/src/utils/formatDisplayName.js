// utils/formatDisplayName.js
export const formatDisplayName = (displayName) => {
    if (!displayName) return '';
    console.log(displayName);
    
    // Check if 'text' exists directly
    if (displayName.text) {
      return displayName.text;
    }
  
    // Traverse the 'extra' arrays to extract 'text'
    let name = '';
    const traverse = (obj) => {
      if (obj.text) {
        name += obj.text;
      }
      if (obj.extra && Array.isArray(obj.extra)) {
        obj.extra.forEach(item => traverse(item));
      }
    };
  
    traverse(displayName);
    return name.trim();
  };
  