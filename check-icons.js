const lucide = require('lucide-react');
console.log('FileArchive:', lucide.FileArchive);
console.log('Archive:', lucide.Archive);
console.log('FolderArchive:', lucide.FolderArchive);
console.log('Zip:', lucide.Zip);
console.log('All exports with "Archive" or "File":', Object.keys(lucide).filter(k => k.includes('Archive') || k.includes('File')));
