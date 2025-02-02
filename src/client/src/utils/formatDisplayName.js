export const formatDisplayName = (displayName) => {
    if (!displayName) return '';
    console.log(displayName);
    
    if (displayName.text) {
      return displayName.text;
    }
  
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
  