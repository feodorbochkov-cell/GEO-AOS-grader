import { checkMachineInterface } from "./machine-interface"
import { callBrowserService } from "./browser-operability"
import { checkAgentDiscovery } from "./agent-discovery"
import { checkAuthSecurity } from "./auth-security"
import { getGrade } from "./scoring"
import type { AgentCheckResponse, BlockResult, SSEEvent } from "./types"

const BLOCK_NAMES = ["machineInterface", "browserOperability", "agentDiscovery", "authSecurity"] as const
type BlockName = typeof BLOCK_NAMES[number]

const EMPTY_BLOCKS: AgentCheckResponse["blocks"] = {
  machineInterface:    { score: 0, maxScore: 30, checks: {} },
  browserOperability:  { score: 0, maxScore: 25, status: "pending", checks: {} },
  agentDiscovery:      { score: 0, maxScore: 25, checks: {} },
  authSecurity:        { score: 0, maxScore: 20, checks: {} },
}

export async function runAgentCheck(
  url: string,
  domain: string,
  send: (event: SSEEvent) => void
): Promise<void> {
  const blocks = { ...EMPTY_BLOCKS }

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Scan timed out")), 30_000)
  )

  const blockFns = [
    () => checkMachineInterface(url),
    () => callBrowserService(url),
    () => checkAgentDiscovery(url),
    () => checkAuthSecurity(url),
  ]

  const blockPromises = blockFns.map((fn, i) => {
    const name = BLOCK_NAMES[i]
    return fn()
      .then(result => {
        if (name === "browserOperability") {
          blocks[name] = result as AgentCheckResponse["blocks"]["browserOperability"]
        } else {
          blocks[name] = result as AgentCheckResponse["blocks"][Exclude<BlockName, "browserOperability">]
        }
        send({ type: "block", block: name, result: result as BlockResult })
      })
      .catch(() => {
        send({ type: "block", block: name, result: blocks[name] })
      })
  })

  await Promise.race([
    Promise.allSettled(blockPromises),
    timeout,
  ]).catch(() => { /* timeout — send whatever we have */ })

  const totalScore =
    blocks.machineInterface.score +
    blocks.browserOperability.score +
    blocks.agentDiscovery.score +
    blocks.authSecurity.score

  const { grade, gradeColor } = getGrade(totalScore)

  send({
    type: "complete",
    result: {
      domain,
      scannedAt: new Date().toISOString(),
      totalScore,
      grade,
      gradeColor,
      blocks,
    },
  })
}
