exports.updateTournamentSettings = async (req, res) => {
    const { start, end, regStart, regEnd, regOpen } = req.body;
    
    await Tournament.findByIdAndUpdate(req.params.id, {
      tournamentStart: new Date(start),
      tournamentEnd: new Date(end),
      registrationStart: new Date(regStart),
      registrationEnd: new Date(regEnd),
      registrationOpen: regOpen === 'on'
    });
  
    res.redirect('/admin/tournaments');
  };
  