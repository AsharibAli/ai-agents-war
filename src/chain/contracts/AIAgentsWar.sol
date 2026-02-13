// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AIAgentsWar {
    address public owner;

    struct Battle {
        string battleId;
        string winner;
        string loser;
        uint8 winnerScore;
        uint8 loserScore;
        string category;
        string judgeReasoning;
        string ipfsHash;
        uint256 timestamp;
    }

    Battle[] public battles;
    mapping(string => uint256) public battleIndex;

    struct AgentStats {
        uint256 wins;
        uint256 losses;
        uint256 totalScore;
        uint256 battlesPlayed;
    }
    mapping(string => AgentStats) public agentStats;

    uint256 public totalBattles;

    // Leaderboard tracking
    string[] public registeredAgents;
    mapping(string => bool) public isRegistered;

    event BattleRecorded(
        uint256 indexed battleNumber,
        string battleId,
        string winner,
        string loser,
        uint8 winnerScore,
        uint8 loserScore,
        string category,
        string ipfsHash,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function recordBattle(
        string calldata _battleId,
        string calldata _winner,
        string calldata _loser,
        uint8 _winnerScore,
        uint8 _loserScore,
        string calldata _category,
        string calldata _judgeReasoning,
        string calldata _ipfsHash
    ) external {
        Battle memory b = Battle({
            battleId: _battleId,
            winner: _winner,
            loser: _loser,
            winnerScore: _winnerScore,
            loserScore: _loserScore,
            category: _category,
            judgeReasoning: _judgeReasoning,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp
        });

        battles.push(b);
        battleIndex[_battleId] = battles.length - 1;

        // Auto-register agents for leaderboard
        if (!isRegistered[_winner]) {
            registeredAgents.push(_winner);
            isRegistered[_winner] = true;
        }
        if (!isRegistered[_loser]) {
            registeredAgents.push(_loser);
            isRegistered[_loser] = true;
        }

        agentStats[_winner].wins++;
        agentStats[_winner].totalScore += _winnerScore;
        agentStats[_winner].battlesPlayed++;

        agentStats[_loser].losses++;
        agentStats[_loser].totalScore += _loserScore;
        agentStats[_loser].battlesPlayed++;

        totalBattles++;

        emit BattleRecorded(
            totalBattles,
            _battleId,
            _winner,
            _loser,
            _winnerScore,
            _loserScore,
            _category,
            _ipfsHash,
            block.timestamp
        );
    }

    function getBattle(uint256 index) external view returns (Battle memory) {
        require(index < battles.length, "Battle does not exist");
        return battles[index];
    }

    function getBattleById(string calldata _battleId) external view returns (Battle memory) {
        return battles[battleIndex[_battleId]];
    }

    function getAgentStats(string calldata _agentName) external view returns (AgentStats memory) {
        return agentStats[_agentName];
    }

    function getRecentBattles(uint256 count) external view returns (Battle[] memory) {
        uint256 len = battles.length;
        if (count > len) count = len;
        Battle[] memory recent = new Battle[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = battles[len - count + i];
        }
        return recent;
    }

    function getTotalBattles() external view returns (uint256) {
        return totalBattles;
    }

    function getLeaderboard() external view returns (string[] memory agents, AgentStats[] memory stats) {
        uint256 len = registeredAgents.length;
        agents = new string[](len);
        stats = new AgentStats[](len);
        for (uint256 i = 0; i < len; i++) {
            agents[i] = registeredAgents[i];
            stats[i] = agentStats[registeredAgents[i]];
        }
        return (agents, stats);
    }
}
