import { getAllUsers } from '@/lib/dbQueries';

export default async function PrivilegeMarquee() {
  const allUsers = await getAllUsers();
  
  // Get players with active privilege
  const activePlayers = allUsers.filter(u => u.hasSpecialPrivilege && !u.specialPrivilegeUsed);
  
  if (activePlayers.length === 0) {
    return (
      <div className="marquee-container">
        <div className="marquee-content text-slate-600">
          ⚡ All special privileges have been consumed
        </div>
      </div>
    );
  }

  const namesList = activePlayers.map(p => p.name).join('  •  ');
  const scrollText = `⚡ Special Privilege Active (${activePlayers.length}): ${namesList}  •  `;

  return (
    <div className="marquee-container">
      <div className="marquee-content text-emerald-800">
        {/* Repeat the text twice to ensure continuous looping without gaps */}
        {scrollText} {scrollText} {scrollText}
      </div>
    </div>
  );
}
