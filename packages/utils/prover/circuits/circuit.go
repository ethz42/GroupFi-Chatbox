package circuits

import (
	"github.com/brevis-network/brevis-sdk/sdk"
	"github.com/ethereum/go-ethereum/common"
)

type AppCircuit struct{
	UserAddr sdk.Uint248
}

var _ sdk.AppCircuit = &AppCircuit{}

func (c *AppCircuit) Allocate() (maxReceipts, maxStorage, maxTransactions int) {
	// This demo app is only going to use two storage data at a time so
	// we can simply limit the max number of data for storage to 1 and
	// 0 for all others
	return 0, 32, 0
}

var USDTAddress = sdk.ConstUint248(
	common.HexToAddress("0xdac17f958d2ee523a2206206994597c13d831ec7"))
var minimumToken = sdk.ConstUint248(1000000) // minimum 1 USDT, 6 decimals

func (c *AppCircuit) Define(api *sdk.CircuitAPI, in sdk.DataInput) error {
	slots := sdk.NewDataStream(api, in.StorageSlots)

	var u248 = api.Uint248
	var b32 = api.Bytes32
	sdk.AssertEach(slots, func(current sdk.StorageSlot) sdk.Uint248 {
		contractIsEq := u248.IsEqual(current.Contract, USDTAddress)

		// mapping(address => uint) public balances;
		// balance slot location 0x0000000000000000000000000000000000000000000000000000000000000002
		// slot key = keccak(u256(userAddress).u256(location)
		balanceSlot := api.SlotOfStructFieldInMapping(2, 0, api.ToBytes32(c.UserAddr))
		balanceSlotKeyIsEq := b32.IsEqual(current.Slot, balanceSlot)

		return u248.And(
			contractIsEq,
			balanceSlotKeyIsEq,
		)
	})

	balances := sdk.Map(slots, func(current sdk.StorageSlot) sdk.Uint248 {
		return api.ToUint248(current.Value)
	})
	totalBalance := sdk.Sum(balances)
	u248.AssertIsLessOrEqual(minimumToken, totalBalance)

	api.OutputAddress(c.UserAddr)
	return nil
}
